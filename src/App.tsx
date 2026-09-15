import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, testConnection, seedInitialDataIfNeeded, DEFAULT_BARBEIROS, DEFAULT_SERVICOS } from './firebase/config';
import {
  UserRole,
  Barbeiro,
  Servico,
  Agendamento,
  Disponibilidade,
  UserProfile,
  AppNotification,
} from './types';
import { Header } from './components/common/Header';
import { FooterFeatures } from './components/common/FooterFeatures';
import { NotificationModal } from './components/common/NotificationModal';
import { AuthModal } from './components/common/AuthModal';
import { InstallPwaModal } from './components/common/InstallPwaModal';
import { ClientModule } from './components/client/ClientModule';
import { BarberModule } from './components/barber/BarberModule';
import { AdminModule } from './components/admin/AdminModule';
import {
  registerServiceWorker,
  subscribeNotifications,
  triggerBrowserNotification,
} from './services/notificationService';

export default function App() {
  // Active role: 'cliente' | 'barbeiro' | 'administrador'
  const [currentRole, setCurrentRole] = useState<UserRole>('cliente');

  // Authenticated roles tracker to ensure clientes cannot leak into barber or admin views
  const [unlockedRoles, setUnlockedRoles] = useState<{ barbeiro: boolean; administrador: boolean }>({
    barbeiro: false,
    administrador: false,
  });
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    targetRole: 'barbeiro' | 'administrador';
  }>({
    isOpen: false,
    targetRole: 'barbeiro',
  });

  // PWA Install Modal state
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Notifications modal
  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Core Data States
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>(DEFAULT_BARBEIROS);
  const [servicos, setServicos] = useState<Servico[]>(DEFAULT_SERVICOS);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active simulated user profiles based on role
  const clientUser: UserProfile = {
    id: 'cli-joao',
    nome: 'João Silva',
    telefone: '(11) 98765-4321',
    role: 'cliente',
    status: 'ativo',
    dataCriacao: new Date().toISOString(),
  };

  const barberUser = barbeiros.find((b) => b.id === 'barb-carlos') || barbeiros[0];

  // Bootstrap Firebase & Seed Data
  useEffect(() => {
    // 1. Validate connection as per firebase-skill guidelines
    testConnection();

    // 2. Register Service Worker for PWA & Push
    registerServiceWorker();

    // 3. Seed initial database records if empty
    seedInitialDataIfNeeded().then(() => {
      setIsLoading(false);
    });

    // 4. Firestore Real-Time Subscriptions
    const unsubServicos = onSnapshot(collection(db, 'servicos'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servico));
        setServicos(list);
      }
    });

    const unsubBarbeiros = onSnapshot(collection(db, 'barbeiros'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barbeiro));
        setBarbeiros(list);
      }
    });

    const unsubAgendamentos = onSnapshot(
      query(collection(db, 'agendamentos'), orderBy('data', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Agendamento));
        setAgendamentos(list);
      }
    );

    const unsubDisp = onSnapshot(collection(db, 'disponibilidades'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Disponibilidade));
      setDisponibilidades(list);
    });

    return () => {
      unsubServicos();
      unsubBarbeiros();
      unsubAgendamentos();
      unsubDisp();
    };
  }, []);

  // Subscribe to notifications for the active user
  const activeUserId =
    currentRole === 'cliente'
      ? clientUser.id
      : currentRole === 'barbeiro'
      ? barberUser.id
      : 'admin';

  useEffect(() => {
    const unsub = subscribeNotifications(activeUserId, (notifs) => {
      setNotifications(notifs);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [activeUserId]);

  const handleRefresh = useCallback(() => {
    // onSnapshot automatically synchronizes, but we can trigger state updates if needed
  }, []);

  const handleRoleChangeAttempt = (role: UserRole) => {
    if (role === 'cliente') {
      setCurrentRole('cliente');
      return;
    }

    // If attempting to switch to barber or admin, verify if already authenticated
    if (role === 'barbeiro') {
      if (unlockedRoles.barbeiro) {
        setCurrentRole('barbeiro');
      } else {
        setAuthModalState({ isOpen: true, targetRole: 'barbeiro' });
      }
    } else if (role === 'administrador') {
      if (unlockedRoles.administrador) {
        setCurrentRole('administrador');
      } else {
        setAuthModalState({ isOpen: true, targetRole: 'administrador' });
      }
    }
  };

  const handleAuthSuccess = () => {
    const target = authModalState.targetRole;
    setUnlockedRoles((prev) => ({ ...prev, [target]: true }));
    setCurrentRole(target);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 flex flex-col selection:bg-[#D4AF37] selection:text-zinc-950 font-sans">
      {/* Top Bar with Role Switcher & Controls */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChangeAttempt}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        activeUserName={
          currentRole === 'cliente'
            ? clientUser.nome
            : currentRole === 'barbeiro'
            ? barberUser.nome
            : 'Administrador'
        }
      />

      {/* Main Content Area - Expansive website layout (100% full bleed on mobile, max-w-7xl on desktop) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6">
        <div className="w-full bg-[#141417] sm:rounded-2xl border-y sm:border border-zinc-800/80 p-3 sm:p-6 lg:p-8 sm:shadow-2xl">
          {currentRole === 'cliente' && (
            <ClientModule
              currentUser={clientUser}
              barbeiros={barbeiros}
              servicos={servicos}
              agendamentos={agendamentos}
              onRefreshData={handleRefresh}
            />
          )}

          {currentRole === 'barbeiro' && (
            <BarberModule
              currentBarber={barberUser}
              agendamentos={agendamentos}
              servicos={servicos}
              disponibilidade={disponibilidades.find((d) => d.barbeiroId === barberUser.id)}
              onRefreshData={handleRefresh}
            />
          )}

          {currentRole === 'administrador' && (
            <AdminModule
              barbeiros={barbeiros}
              servicos={servicos}
              agendamentos={agendamentos}
              onRefreshData={handleRefresh}
            />
          )}
        </div>
      </main>

      {/* Golden Brand Features Footer as seen in image */}
      <FooterFeatures />

      {/* Push Notification Drawer / Modal */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
        currentUserId={activeUserId}
      />

      {/* Security Auth Modal for Restricting Barber & Admin Access */}
      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState((prev) => ({ ...prev, isOpen: false }))}
        targetRole={authModalState.targetRole}
        onSuccess={handleAuthSuccess}
      />

      {/* PWA Install Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
