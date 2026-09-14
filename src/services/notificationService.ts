import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppNotification } from '../types';

// Play a pleasant gold/luxury chime using Web Audio API
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // Second note higher harmony
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (e) {
    console.debug('AudioContext not allowed without user gesture yet:', e);
  }
}

// Request Browser Push Notification Permission
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações de sistema.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return 'denied';
  }
}

// Trigger real browser push notification
export async function triggerBrowserNotification(title: string, body: string, icon = '/icons/icon-192.png') {
  playNotificationSound();

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ vibrate: [100, 50, 100], data: { url: window.location.href } } as any),
        });
        return;
      }

      new Notification(title, {
        body,
        icon,
      });
    } catch (e) {
      console.warn('Falha ao disparar notificação nativa:', e);
    }
  }
}

// Register service worker for PWA & Push
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado com sucesso:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('Falha ao registrar Service Worker:', err);
    }
  }
  return null;
}

// Send and persist notification in Firestore
export async function sendNotification(
  usuarioId: string,
  titulo: string,
  mensagem: string,
  tipo: AppNotification['tipo'] = 'sistema',
  agendamentoId?: string
) {
  try {
    const notif: Omit<AppNotification, 'id'> = {
      usuarioId,
      titulo,
      mensagem,
      lida: false,
      tipo,
      dataCriacao: new Date().toISOString(),
      ...(agendamentoId ? { agendamentoId } : {}),
    };

    await addDoc(collection(db, 'notificacoes'), notif);

    // Also trigger native push and sound
    triggerBrowserNotification(titulo, mensagem);
  } catch (err) {
    console.error('Erro ao enviar notificação:', err);
  }
}

// Mark notification as read
export async function markNotificationAsRead(id: string) {
  try {
    await updateDoc(doc(db, 'notificacoes', id), {
      lida: true,
    });
  } catch (err) {
    console.error('Erro ao marcar notificação como lida:', err);
  }
}

// Subscribe to real-time notifications for a user or admin/all
export function subscribeNotifications(
  usuarioId: string,
  callback: (notifications: AppNotification[]) => void
) {
  try {
    const q = query(
      collection(db, 'notificacoes'),
      orderBy('dataCriacao', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const allNotifs: AppNotification[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, 'id'>),
      }));

      // Filter for target user, 'all', or if role matches
      const userNotifs = allNotifs.filter(
        (n) => n.usuarioId === usuarioId || n.usuarioId === 'all' || (usuarioId.startsWith('barb-') && n.usuarioId === 'barbeiro')
      );
      callback(userNotifs);
    }, (error) => {
      console.warn('Notification snapshot warning:', error);
    });
  } catch (err) {
    console.error('Error setting up notification listener:', err);
    return () => {};
  }
}
