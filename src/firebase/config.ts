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
    pin: 'barber123',
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
    pin: 'barber123',
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
    pin: 'barber123',
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

    // Purge any remnant mock/test data from Firestore so the app runs in clean production mode
    await purgeAllTestData();
  } catch (err) {
    console.error('Error during initial Firestore setup:', err);
  }
}

/**
 * Purges all mock/test records from Firestore to ensure a completely clean environment for production run.
 */
export async function purgeAllTestData(): Promise<void> {
  try {
    // 1. Delete all test appointments
    const agendamentosSnap = await getDocs(collection(db, 'agendamentos'));
    if (!agendamentosSnap.empty) {
      const batch = writeBatch(db);
      let count = 0;
      for (const docSnap of agendamentosSnap.docs) {
        const id = docSnap.id;
        const data = docSnap.data();
        const isTestId = ['agend-1', 'agend-2', 'agend-3', 'agend-4'].includes(id);
        const isTestClient =
          data.clienteNome === 'João Silva' ||
          data.clienteNome === 'Pedro Santos' ||
          data.clienteNome === 'Lucas Ferreira' ||
          data.clienteNome === 'Rafael Oliveira';
        
        if (isTestId || isTestClient) {
          batch.delete(docSnap.ref);
          count++;
        }
      }
      if (count > 0) {
        await batch.commit();
        console.log(`[Clean Mode] Removidos ${count} agendamentos de teste do Firestore.`);
      }
    }

    // 2. Delete test administrators (e.g. admin-matriz-1, admin-jardins-1)
    const adminsSnap = await getDocs(collection(db, 'administradores_barbearia'));
    if (!adminsSnap.empty) {
      const batch = writeBatch(db);
      let count = 0;
      for (const docSnap of adminsSnap.docs) {
        if (['admin-matriz-1', 'admin-jardins-1'].includes(docSnap.id)) {
          batch.delete(docSnap.ref);
          count++;
        }
      }
      if (count > 0) {
        await batch.commit();
        console.log(`[Clean Mode] Removidos administradores de teste.`);
      }
    }

    // 3. Delete extra mock units (e.g. unidade-jardins, unidade-morumbi)
    const unitsSnap = await getDocs(collection(db, 'barbearias'));
    if (!unitsSnap.empty) {
      const batch = writeBatch(db);
      let count = 0;
      for (const docSnap of unitsSnap.docs) {
        if (['unidade-jardins', 'unidade-morumbi'].includes(docSnap.id)) {
          batch.delete(docSnap.ref);
          count++;
        }
      }
      if (count > 0) {
        await batch.commit();
        console.log(`[Clean Mode] Removidas unidades de teste.`);
      }
    }
  } catch (err) {
    console.error('Erro ao purgar dados de teste:', err);
  }
}
