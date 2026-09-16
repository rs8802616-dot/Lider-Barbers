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
import { SuperAdminModule } from './components/superadmin/SuperAdminModule';
import {
  registerServiceWorker,
  subscribeNotifications,
  triggerBrowserNotification,
} from './services/notificationService';

export default function App() {
  // Active role: 'cliente' | 'barbeiro' | 'administrador' | 'super_admin'
  const [currentRole, setCurrentRole] = useState<UserRole>('cliente');

  // Selected Barber ID for Direct Invite link / Client preference
  const [invitedBarberId, setInvitedBarberId] = useState<string | null>(null);
  const [initialClientTab, setInitialClientTab] = useState<'home' | 'agendar' | 'agendamentos' | 'perfil'>('home');

  // Currently logged-in / active barber for BarberModule (supports switching if multiple barbers or admin is also a barber)
  const [activeBarberId, setActiveBarberId] = useState<string>('barb-carlos');

  // Authenticated roles tracker to ensure clientes cannot leak into barber, admin, or master views
  const [unlockedRoles, setUnlockedRoles] = useState<{
    barbeiro: boolean;
    administrador: boolean;
    super_admin: boolean;
  }>({
    barbeiro: false,
    administrador: false,
    super_admin: false,
  });
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    targetRole: 'barbeiro' | 'administrador' | 'super_admin';
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

  const barberUser = barbeiros.find((b) => b.id === activeBarberId) || barbeiros[0];

  // Route Dispatcher: handles /b/:slug, /barbeiro/:slug, /super-admin, /admin, /cliente, /agendar
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();

      // 1. Direct Barber Link: /b/:slug or /barbeiro/:slug
      const bMatch = pathname.match(/^\/b\/(.+)$/) || pathname.match(/^\/barbeiro\/(.+)$/);
      if (bMatch && bMatch[1]) {
        const slugOrId = decodeURIComponent(bMatch[1]).trim().toLowerCase();
        // Find matching barber by slug or by ID
        const matchedBarber = barbeiros.find(
          (b) =>
            (b.slug && b.slug.toLowerCase() === slugOrId) ||
            b.id.toLowerCase() === slugOrId ||
            b.nome.toLowerCase().replace(/\s+/g, '-') === slugOrId
        );

        if (matchedBarber) {
          setInvitedBarberId(matchedBarber.id);
          localStorage.setItem('lider_prefered_barber_id', matchedBarber.id);
          setInitialClientTab('agendar');
          setCurrentRole('cliente');
        }
        return;
      }

      // 2. Super Admin route: /super-admin or /master
      if (pathname === '/super-admin' || pathname === '/master') {
        if (unlockedRoles.super_admin) {
          setCurrentRole('super_admin');
        } else {
          setAuthModalState({ isOpen: true, targetRole: 'super_admin' });
        }
        return;
      }

      // 3. Admin route: /admin or /administrador
      if (pathname === '/admin' || pathname === '/administrador') {
        if (unlockedRoles.administrador) {
          setCurrentRole('administrador');
        } else {
          setAuthModalState({ isOpen: true, targetRole: 'administrador' });
        }
        return;
      }

      // 4. Client booking direct route: /agendar
      if (pathname === '/agendar') {
        setInitialClientTab('agendar');
        setCurrentRole('cliente');
        return;
      }

      // 5. Default client: / or /cliente
      if (pathname === '/cliente' || pathname === '/') {
        setCurrentRole('cliente');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [barbeiros, unlockedRoles]);

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

    // If attempting to switch to barber, admin, or super_admin, verify if authenticated
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
    } else if (role === 'super_admin') {
      if (unlockedRoles.super_admin) {
        setCurrentRole('super_admin');
      } else {
        setAuthModalState({ isOpen: true, targetRole: 'super_admin' });
      }
    }
  };

  const handleAuthSuccess = (role?: 'barbeiro' | 'administrador' | 'super_admin') => {
    const target = role || authModalState.targetRole;
    setUnlockedRoles((prev) => ({ ...prev, [target]: true }));
    setCurrentRole(target);
  };

  const handleLogoutToClient = () => {
    setCurrentRole('cliente');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 flex flex-col selection:bg-[#D4AF37] selection:text-zinc-950 font-sans">
      {/* Top Bar with Role Switcher & Controls */}
      <Header
        user={{
          role: currentRole,
          nome:
            currentRole === 'cliente'
              ? clientUser.nome
              : currentRole === 'barbeiro'
              ? barberUser.nome
              : currentRole === 'super_admin'
              ? 'Master (Dono)'
              : 'Admin Barbearia',
          isAdmin: currentRole === 'barbeiro' ? barberUser.isAdmin : true,
        }}
        currentRole={currentRole}
        onRoleChange={handleRoleChangeAttempt}
        onLogoutToClient={handleLogoutToClient}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        activeUserName={
          currentRole === 'cliente'
            ? clientUser.nome
            : currentRole === 'barbeiro'
            ? barberUser.nome
            : currentRole === 'super_admin'
            ? 'Master (Dono)'
            : 'Admin Barbearia'
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
              onOpenStaffLogin={() => setAuthModalState({ isOpen: true, targetRole: 'barbeiro' })}
              initialBarberId={invitedBarberId}
              initialTab={initialClientTab}
            />
          )}

          {currentRole === 'barbeiro' && (
            <BarberModule
              currentBarber={barberUser}
              agendamentos={agendamentos}
              servicos={servicos}
              disponibilidade={disponibilidades.find((d) => d.barbeiroId === barberUser.id)}
              onRefreshData={handleRefresh}
              onSwitchToAdmin={() => {
                if (unlockedRoles.administrador) {
                  setCurrentRole('administrador');
                } else {
                  setAuthModalState({ isOpen: true, targetRole: 'administrador' });
                }
              }}
            />
          )}

          {currentRole === 'administrador' && (
            <AdminModule
              barbeiros={barbeiros}
              servicos={servicos}
              agendamentos={agendamentos}
              onRefreshData={handleRefresh}
              onSwitchToBarber={(barberId) => {
                setActiveBarberId(barberId);
                setUnlockedRoles((prev) => ({ ...prev, barbeiro: true }));
                setCurrentRole('barbeiro');
              }}
            />
          )}

          {currentRole === 'super_admin' && (
            <SuperAdminModule onRefreshData={handleRefresh} />
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
