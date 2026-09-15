import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { Barbeiro, Servico, Disponibilidade, Agendamento } from '../types';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

export async function ensureAnonymousAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch {
    // If anonymous auth is disabled on the project, proceed gracefully with public rules
  }
}

// Seed data based on the PRD and mockup screenshot
export const DEFAULT_SERVICOS: Servico[] = [
  {
    id: 'serv-corte',
    nome: 'Corte de cabelo',
    descricao: 'Corte tradicional ou moderno com acabamento impecável na tesoura e máquina.',
    preco: 50.0,
    duracaoMinutos: 30,
    status: 'ativo',
    icone: 'scissors',
  },
  {
    id: 'serv-barba',
    nome: 'Barba',
    descricao: 'Modelagem completa da barba com toalha quente, navalhete e óleo hidratante.',
    preco: 35.0,
    duracaoMinutos: 30,
    status: 'ativo',
    icone: 'sparkles',
  },
  {
    id: 'serv-corte-barba',
    nome: 'Corte + Barba',
    descricao: 'Combo completo de corte estilizado e barba alinhada com toalha quente.',
    preco: 70.0,
    duracaoMinutos: 60,
    status: 'ativo',
    icone: 'crown',
  },
  {
    id: 'serv-pezinho',
    nome: 'Pezinho',
    descricao: 'Alinhamento dos contornos do cabelo e nuca com navalha.',
    preco: 20.0,
    duracaoMinutos: 20,
    status: 'ativo',
    icone: 'check',
  },
  {
    id: 'serv-sobrancelha',
    nome: 'Sobrancelha',
    descricao: 'Design e limpeza das sobrancelhas masculinas na navalha ou pinça.',
    preco: 15.0,
    duracaoMinutos: 15,
    status: 'ativo',
    icone: 'eye',
  },
];

export const DEFAULT_BARBEIROS: Barbeiro[] = [
  {
    id: 'barb-carlos',
    nome: 'Carlos Silva',
    slug: 'carlos-silva',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    especialidade: 'Especialista em cortes (Sócio/Admin)',
    descricao: 'Mais de 10 anos de experiência em cortes clássicos, sócio proprietário e gestor da unidade.',
    servicosIds: ['serv-corte', 'serv-barba', 'serv-corte-barba', 'serv-pezinho', 'serv-sobrancelha'],
    status: 'ativo',
    telefone: '(11) 98765-4321',
    email: 'carlos.admin@liderbarbers.com.br',
    isAdmin: true, // Carlos atua como Barbeiro E também é Administrador da barbearia!
    avaliacao: 4.9,
    dataCriacao: new Date().toISOString(),
  },
  {
    id: 'barb-rafael',
    nome: 'Rafael Costa',
    slug: 'rafael-costa',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    especialidade: 'Barba e estilo',
    descricao: 'Mestre em barboterapia, alinhamento de barba e visagismo masculino.',
    servicosIds: ['serv-corte', 'serv-barba', 'serv-corte-barba', 'serv-pezinho'],
    status: 'ativo',
    telefone: '(11) 97654-3210',
    email: 'rafael.barber@liderbarbers.com.br',
    isAdmin: false,
    avaliacao: 4.8,
    dataCriacao: new Date().toISOString(),
  },
  {
    id: 'barb-lucas',
    nome: 'Lucas Mendes',
    slug: 'lucas-mendes',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    especialidade: 'Cortes modernos',
    descricao: 'Especialista em degrade navalhado, freestyle, texturização e tendências urbanas.',
    servicosIds: ['serv-corte', 'serv-corte-barba', 'serv-pezinho', 'serv-sobrancelha'],
    status: 'ativo',
    telefone: '(11) 96543-2109',
    email: 'lucas.barber@liderbarbers.com.br',
    isAdmin: false,
    avaliacao: 4.9,
    dataCriacao: new Date().toISOString(),
  },
];

export async function testConnection() {
  try {
    await ensureAnonymousAuth();
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up...');
    }
  }
}

export async function seedInitialDataIfNeeded() {
  try {
    await ensureAnonymousAuth();
    const servicosSnap = await getDocs(collection(db, 'servicos'));
    if (servicosSnap.empty) {
      console.log('Seeding initial servicos into Firestore...');
      const batch = writeBatch(db);
      for (const serv of DEFAULT_SERVICOS) {
        batch.set(doc(db, 'servicos', serv.id), serv);
      }
      await batch.commit();
    }

    const barbeirosSnap = await getDocs(collection(db, 'barbeiros'));
    if (barbeirosSnap.empty) {
      console.log('Seeding initial barbeiros into Firestore...');
      const batch = writeBatch(db);
      for (const barb of DEFAULT_BARBEIROS) {
        batch.set(doc(db, 'barbeiros', barb.id), barb);
      }
      await batch.commit();
    }

    // Check availability
    const dispSnap = await getDocs(collection(db, 'disponibilidades'));
    if (dispSnap.empty) {
      const batch = writeBatch(db);
      for (const barb of DEFAULT_BARBEIROS) {
        const disp: Disponibilidade = {
          id: `disp-${barb.id}`,
          barbeiroId: barb.id,
          diasSemana: [1, 2, 3, 4, 5, 6], // Seg a Sáb
          horarioInicio: '08:00',
          horarioFim: '18:00',
          intervaloMinutos: 10,
          pausaInicio: '12:00',
          pausaFim: '13:00',
          dataAtualizacao: new Date().toISOString(),
        };
        batch.set(doc(db, 'disponibilidades', disp.id), disp);
      }
      await batch.commit();
    }

    // Check initial sample appointments to populate dashboard and barber agenda like in the mockup
    const agendamentosSnap = await getDocs(collection(db, 'agendamentos'));
    if (agendamentosSnap.empty) {
      const today = new Date().toISOString().split('T')[0];
      const sampleAgendamentos: Agendamento[] = [
        {
          id: 'agend-1',
          clienteId: 'cli-joao',
          clienteNome: 'João Silva',
          clienteTelefone: '(11) 98765-4321',
          barbeiroId: 'barb-carlos',
          barbeiroNome: 'Carlos Silva',
          servicoId: 'serv-corte',
          servicoNome: 'Corte de cabelo',
          data: today,
          horarioInicio: '08:00',
          horarioFim: '08:30',
          duracaoMinutos: 30,
          status: 'confirmado',
          valor: 50.0,
          dataCriacao: new Date().toISOString(),
        },
        {
          id: 'agend-2',
          clienteId: 'cli-pedro',
          clienteNome: 'Pedro Santos',
          clienteTelefone: '(11) 99123-4567',
          barbeiroId: 'barb-carlos',
          barbeiroNome: 'Carlos Silva',
          servicoId: 'serv-barba',
          servicoNome: 'Barba',
          data: today,
          horarioInicio: '09:00',
          horarioFim: '09:30',
          duracaoMinutos: 30,
          status: 'em_atendimento',
          valor: 35.0,
          dataCriacao: new Date().toISOString(),
        },
        {
          id: 'agend-3',
          clienteId: 'cli-lucas',
          clienteNome: 'Lucas Ferreira',
          clienteTelefone: '(11) 98888-7777',
          barbeiroId: 'barb-carlos',
          barbeiroNome: 'Carlos Silva',
          servicoId: 'serv-corte-barba',
          servicoNome: 'Corte + Barba',
          data: today,
          horarioInicio: '10:00',
          horarioFim: '11:00',
          duracaoMinutos: 60,
          status: 'agendado',
          valor: 70.0,
          dataCriacao: new Date().toISOString(),
        },
        {
          id: 'agend-4',
          clienteId: 'cli-rafael',
          clienteNome: 'Rafael Oliveira',
          clienteTelefone: '(11) 97777-6666',
          barbeiroId: 'barb-carlos',
          barbeiroNome: 'Carlos Silva',
          servicoId: 'serv-corte',
          servicoNome: 'Corte de cabelo',
          data: today,
          horarioInicio: '11:00',
          horarioFim: '11:30',
          duracaoMinutos: 30,
          status: 'agendado',
          valor: 50.0,
          dataCriacao: new Date().toISOString(),
        },
      ];

      const batch = writeBatch(db);
      for (const ag of sampleAgendamentos) {
        batch.set(doc(db, 'agendamentos', ag.id), ag);
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Error during initial Firestore seeding:', err);
  }
}
