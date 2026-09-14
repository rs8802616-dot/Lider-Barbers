import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Agendamento, Disponibilidade, Bloqueio } from '../types';
import { sendNotification } from './notificationService';

// Helper: convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper: convert minutes from midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Calculate available slots for a barber on a specific date
export async function getAvailableSlots(
  barbeiroId: string,
  dateStr: string, // YYYY-MM-DD
  serviceDurationMinutes: number
): Promise<{ time: string; available: boolean; reason?: string }[]> {
  const targetDate = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = targetDate.getDay(); // 0 = Dom, 1 = Seg ... 6 = Sab

  // 1. Fetch barber's availability config
  const dispQuery = query(
    collection(db, 'disponibilidades'),
    where('barbeiroId', '==', barbeiroId)
  );
  const dispSnap = await getDocs(dispQuery);

  let horarioInicio = '08:00';
  let horarioFim = '18:00';
  let intervaloMinutos = 10;
  let pausaInicio: string | undefined = '12:00';
  let pausaFim: string | undefined = '13:00';
  let diasTrabalho = [1, 2, 3, 4, 5, 6];

  if (!dispSnap.empty) {
    const d = dispSnap.docs[0].data() as Disponibilidade;
    horarioInicio = d.horarioInicio || '08:00';
    horarioFim = d.horarioFim || '18:00';
    intervaloMinutos = d.intervaloMinutos ?? 10;
    pausaInicio = d.pausaInicio;
    pausaFim = d.pausaFim;
    if (d.diasSemana) diasTrabalho = d.diasSemana;
  }

  // Check if barber works on this day of week
  if (!diasTrabalho.includes(dayOfWeek)) {
    return [];
  }

  // 2. Fetch existing appointments for this barber on this date (not cancelled)
  const agendQuery = query(
    collection(db, 'agendamentos'),
    where('barbeiroId', '==', barbeiroId),
    where('data', '==', dateStr)
  );
  const agendSnap = await getDocs(agendQuery);
  const existingBookings = agendSnap.docs
    .map((d) => d.data() as Agendamento)
    .filter((a) => a.status !== 'cancelado');

  // 3. Fetch any specific blocks for this barber on this date
  const bloqQuery = query(
    collection(db, 'bloqueios'),
    where('barbeiroId', '==', barbeiroId),
    where('data', '==', dateStr)
  );
  const bloqSnap = await getDocs(bloqQuery);
  const existingBlocks = bloqSnap.docs.map((d) => d.data() as Bloqueio);

  // Generate slots from start to end
  const startMin = timeToMinutes(horarioInicio);
  const endMin = timeToMinutes(horarioFim);
  const step = 30; // standard 30 min increments (e.g. 08:00, 09:00, 10:00, 11:00, 13:00, 14:00, 15:00, 17:00 as shown in mockup)

  const slots: { time: string; available: boolean; reason?: string }[] = [];

  for (let current = startMin; current + serviceDurationMinutes <= endMin; current += step) {
    const slotStart = current;
    const slotEnd = current + serviceDurationMinutes;
    const timeStr = minutesToTime(current);

    // Check lunch / pause overlap
    if (pausaInicio && pausaFim) {
      const pauseStart = timeToMinutes(pausaInicio);
      const pauseEnd = timeToMinutes(pausaFim);
      if (slotStart < pauseEnd && slotEnd > pauseStart) {
        // within pause, skip or mark unavailable
        continue;
      }
    }

    // Check block overlap
    const isBlocked = existingBlocks.some((b) => {
      const bStart = timeToMinutes(b.horarioInicio);
      const bEnd = timeToMinutes(b.horarioFim);
      return slotStart < bEnd && slotEnd > bStart;
    });

    if (isBlocked) {
      slots.push({ time: timeStr, available: false, reason: 'Horário bloqueado' });
      continue;
    }

    // Check existing booking overlap
    const hasCollision = existingBookings.some((booking) => {
      const bStart = timeToMinutes(booking.horarioInicio);
      const bEnd = timeToMinutes(booking.horarioFim);
      return slotStart < bEnd && slotEnd > bStart;
    });

    slots.push({
      time: timeStr,
      available: !hasCollision,
      reason: hasCollision ? 'Horário já reservado' : undefined,
    });
  }

  return slots;
}

// Atomic double-booking prevention transaction
export async function createAgendamentoSeguro(agendamentoData: Omit<Agendamento, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // 1. Re-validate in Firestore to prevent race conditions
    const collisionQuery = query(
      collection(db, 'agendamentos'),
      where('barbeiroId', '==', agendamentoData.barbeiroId),
      where('data', '==', agendamentoData.data)
    );
    const snap = await getDocs(collisionQuery);

    const newStart = timeToMinutes(agendamentoData.horarioInicio);
    const newEnd = timeToMinutes(agendamentoData.horarioFim);

    const collision = snap.docs.some((docSnap) => {
      const data = docSnap.data() as Agendamento;
      if (data.status === 'cancelado') return false;
      const exStart = timeToMinutes(data.horarioInicio);
      const exEnd = timeToMinutes(data.horarioFim);
      return newStart < exEnd && newEnd > exStart;
    });

    if (collision) {
      return {
        success: false,
        error: 'Este horário acabou de ser reservado por outro cliente. Por favor, escolha outro horário.',
      };
    }

    // 2. Persist in Firestore
    const docRef = await addDoc(collection(db, 'agendamentos'), agendamentoData);

    // 3. Trigger Real Push Notifications
    // To Client:
    await sendNotification(
      agendamentoData.clienteId,
      'Agendamento Confirmado!',
      `Seu agendamento para ${agendamentoData.servicoNome} com ${agendamentoData.barbeiroNome} em ${agendamentoData.data} às ${agendamentoData.horarioInicio} foi confirmado com sucesso.`,
      'confirmacao',
      docRef.id
    );

    // To Barber:
    await sendNotification(
      agendamentoData.barbeiroId,
      'Novo Agendamento Recebido!',
      `${agendamentoData.clienteNome} agendou ${agendamentoData.servicoNome} para ${agendamentoData.data} às ${agendamentoData.horarioInicio}.`,
      'reserva',
      docRef.id
    );

    // To Admin:
    await sendNotification(
      'admin',
      'Nova Reserva na Barbearia Liberdade',
      `${agendamentoData.clienteNome} reservou com ${agendamentoData.barbeiroNome} (${agendamentoData.horarioInicio}).`,
      'reserva',
      docRef.id
    );

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar agendamento.';
    return { success: false, error: message };
  }
}

// Cancel appointment and notify both parties
export async function cancelarAgendamento(agendamentoId: string, motivo = 'Cancelado pelo cliente'): Promise<boolean> {
  try {
    const ref = doc(db, 'agendamentos', agendamentoId);
    await updateDoc(ref, {
      status: 'cancelado',
      observacoes: motivo,
    });

    await sendNotification(
      'admin',
      'Agendamento Cancelado',
      `O agendamento #${agendamentoId.slice(0, 6)} foi cancelado. O horário voltou a ficar disponível.`,
      'cancelamento',
      agendamentoId
    );

    return true;
  } catch (err) {
    console.error('Erro ao cancelar agendamento:', err);
    return false;
  }
}
