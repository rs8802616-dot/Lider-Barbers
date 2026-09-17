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

// Empty initial data collections for pure production state
export const DEFAULT_SERVICOS: Servico[] = [];
export const DEFAULT_BARBEIROS: Barbeiro[] = [];

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
    // In production mode, do NOT seed mock services or mock barbers.
    // Instead, purge any previously seeded test data so the database is 100% clean.
    await purgeAllTestData();
  } catch (err) {
    console.error('Error during initial Firestore setup:', err);
  }
}

/**
 * Purges all mock/test records from Firestore to ensure a completely clean environment for production run.
 */
export async function purgeAllTestData(purgeAll = false): Promise<void> {
  try {
    await ensureAnonymousAuth();

    // 1. Delete all test barbers
    try {
      const barbeirosSnap = await getDocs(collection(db, 'barbeiros'));
      if (!barbeirosSnap.empty) {
        const batch = writeBatch(db);
        let count = 0;
        for (const docSnap of barbeirosSnap.docs) {
          const id = docSnap.id;
          const data = docSnap.data();
          const isTestId = ['barb-carlos', 'barb-rafael', 'barb-lucas'].includes(id);
          const isTestName = ['Carlos Silva', 'Rafael Costa', 'Lucas Mendes'].includes(data.nome);
          const isTestEmail = data.email?.includes('@liderbarbers.com.br');

          if (purgeAll || isTestId || isTestName || isTestEmail) {
            batch.delete(docSnap.ref);
            count++;
          }
        }
        if (count > 0) {
          await batch.commit();
          console.log(`[Clean Mode] Removidos ${count} barbeiros de teste do Firestore.`);
        }
      }
    } catch (e) {
      console.warn('[Clean Mode] Verificação de barbeiros de teste concluída:', e);
    }

    // 2. Delete all test services
    try {
      const servicosSnap = await getDocs(collection(db, 'servicos'));
      if (!servicosSnap.empty) {
        const batch = writeBatch(db);
        let count = 0;
        for (const docSnap of servicosSnap.docs) {
          const id = docSnap.id;
          const data = docSnap.data();
          const isTestId = [
            'serv-corte',
            'serv-barba',
            'serv-corte-barba',
            'serv-pezinho',
            'serv-sobrancelha',
          ].includes(id);
          const isTestName = [
            'Corte de cabelo',
            'Barba',
            'Corte + Barba',
            'Pezinho',
            'Sobrancelha',
          ].includes(data.nome);

          if (purgeAll || isTestId || isTestName) {
            batch.delete(docSnap.ref);
            count++;
          }
        }
        if (count > 0) {
          await batch.commit();
          console.log(`[Clean Mode] Removidos ${count} serviços de teste do Firestore.`);
        }
      }
    } catch (e) {
      console.warn('[Clean Mode] Verificação de serviços de teste concluída:', e);
    }

    // 3. Delete all test availability
    try {
      const dispSnap = await getDocs(collection(db, 'disponibilidades'));
      if (!dispSnap.empty) {
        const batch = writeBatch(db);
        let count = 0;
        for (const docSnap of dispSnap.docs) {
          const id = docSnap.id;
          const data = docSnap.data();
          const isTestId = ['disp-barb-carlos', 'disp-barb-rafael', 'disp-barb-lucas'].includes(id);
          const isTestBarber = ['barb-carlos', 'barb-rafael', 'barb-lucas'].includes(data.barbeiroId);

          if (purgeAll || isTestId || isTestBarber) {
            batch.delete(docSnap.ref);
            count++;
          }
        }
        if (count > 0) {
          await batch.commit();
          console.log(`[Clean Mode] Removidas ${count} disponibilidades de teste.`);
        }
      }
    } catch (e) {
      console.warn('[Clean Mode] Verificação de disponibilidades de teste concluída:', e);
    }

    // 4. Delete all test appointments
    try {
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
          const isTestBarber = ['barb-carlos', 'barb-rafael', 'barb-lucas'].includes(data.barbeiroId);

          if (purgeAll || isTestId || isTestClient || isTestBarber) {
            batch.delete(docSnap.ref);
            count++;
          }
        }
        if (count > 0) {
          await batch.commit();
          console.log(`[Clean Mode] Removidos ${count} agendamentos de teste do Firestore.`);
        }
      }
    } catch (e) {
      console.warn('[Clean Mode] Verificação de agendamentos de teste concluída:', e);
    }

    // 5. Delete test administrators (e.g. admin-matriz-1, admin-jardins-1)
    try {
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
    } catch (e) {
      console.warn('[Clean Mode] Verificação de administradores de teste concluída:', e);
    }

    // 6. Delete extra mock units (e.g. unidade-jardins, unidade-morumbi)
    try {
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
    } catch (e) {
      console.warn('[Clean Mode] Verificação de unidades de teste concluída:', e);
    }
  } catch (err) {
    console.warn('Informação da purga de dados:', err);
  }
}
