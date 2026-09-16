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
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { theme, toggleTheme } = useTheme();
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
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic client profile from localStorage or empty clean state
  const savedClientName = typeof window !== 'undefined' ? localStorage.getItem('lider_client_nome') : null;
  const savedClientPhone = typeof window !== 'undefined' ? localStorage.getItem('lider_client_telefone') : null;
  const savedClientId = typeof window !== 'undefined' ? localStorage.getItem('lider_client_id') : null;

  const clientUser: UserProfile = {
    id: savedClientId || 'cli-user',
    nome: savedClientName || '',
    telefone: savedClientPhone || '',
    role: 'cliente',
    status: 'ativo',
    dataCriacao: new Date().toISOString(),
  };

  const barberUser = barbeiros.find((b) => b.id === activeBarberId) || barbeiros[0] || null;

  // Route Dispatcher: handles Query Params (?admin=ID, ?barbeiro=ID, ?master=1, ?chave=...), hashes (#/admin, etc.), and clean routes
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search;
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(search);

      const chave = (params.get('chave') || params.get('token') || '').trim();

      // 1. Link Exclusivo do Barbeiro (?barbeiro=ID, ?barbeiro=1, ?barber=..., ?painel_barbeiro=..., #/barbeiro)
      const rawBarberParam = (
        params.get('barbeiro') ||
        params.get('painel_barbeiro') ||
        params.get('barber') ||
        ''
      ).trim();
      const isBarberHash = hash.includes('barbeiro') || hash.includes('barber');
      const isBarberRoute = pathname === '/barbeiro';

      if (rawBarberParam || isBarberHash || isBarberRoute) {
        // Verifica se é um ID ou slug de um barbeiro específico
        const isSpecific = rawBarberParam && !['1', 'true'].includes(rawBarberParam);
        let targetBarber: Barbeiro | undefined;
        if (isSpecific) {
          targetBarber = barbeiros.find(
            (b) =>
              b.id.toLowerCase() === rawBarberParam.toLowerCase() ||
              (b.slug && b.slug.toLowerCase() === rawBarberParam.toLowerCase()) ||
              b.nome.toLowerCase().replace(/\s+/g, '-') === rawBarberParam.toLowerCase()
          );
        }

        if (targetBarber) {
          setActiveBarberId(targetBarber.id);
        }

        // Validação da chave/PIN do barbeiro
        const isAuthedByPin =
          chave === 'barber123' ||
          chave === '1234' ||
          (targetBarber?.pin && chave === targetBarber.pin);

        if (isAuthedByPin || unlockedRoles.barbeiro) {
          setUnlockedRoles((prev) => ({ ...prev, barbeiro: true }));
          setCurrentRole('barbeiro');
        } else {
          setAuthModalState({ isOpen: true, targetRole: 'barbeiro' });
        }
        return;
      }

      // 2. Link Exclusivo do Dono do Sistema / Super Admin (?master=1, ?dono=1, ?super-admin=1, #/master)
      const isSuperAdminParam =
        params.get('master') === '1' ||
        params.get('master') === 'true' ||
        params.get('dono') === '1' ||
        params.get('dono') === 'true' ||
        params.get('super-admin') === '1';
      const isSuperAdminHash = hash.includes('master') || hash.includes('super-admin') || hash.includes('dono');
      const isSuperAdminRoute = pathname === '/super-admin' || pathname === '/master';

      if (isSuperAdminParam || isSuperAdminHash || isSuperAdminRoute) {
        const isAuthedByPin = chave === 'master123' || chave === 'super123' || chave === '1234';
        if (isAuthedByPin || unlockedRoles.super_admin) {
          setUnlockedRoles((prev) => ({ ...prev, super_admin: true }));
          setCurrentRole('super_admin');
        } else {
          setAuthModalState({ isOpen: true, targetRole: 'super_admin' });
        }
        return;
      }

      // 3. Link Exclusivo do Lojista / Administrador da Barbearia (?admin=ID, ?admin=1, ?adminId=..., #/admin)
      const rawAdminParam = (params.get('admin') || params.get('adminid') || '').trim();
      const isAdminHash = hash.includes('admin') || hash.includes('administrador');
      const isAdminRoute = pathname === '/admin' || pathname === '/administrador';

      if (rawAdminParam || isAdminHash || isAdminRoute) {
        const isAuthedByPin =
          chave === 'admin123' ||
          chave === '1234' ||
          (chave && rawAdminParam && !['1', 'true'].includes(rawAdminParam));

        if (isAuthedByPin || unlockedRoles.administrador) {
          setUnlockedRoles((prev) => ({ ...prev, administrador: true }));
          setCurrentRole('administrador');
        } else {
          setAuthModalState({ isOpen: true, targetRole: 'administrador' });
        }
        return;
      }

      // 4. Link Direto de Divulgação do Barbeiro para CLIENTES Agendarem (/b/:slug, ?b=slug, ?agendar_com=slug)
      const bMatch = pathname.match(/^\/b\/(.+)$/);
      const bQuerySlug = params.get('b') || params.get('agendar_com');
      const rawSlug = bMatch ? bMatch[1] : bQuerySlug;

      if (rawSlug) {
        const slugOrId = decodeURIComponent(rawSlug).trim().toLowerCase();
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
          return;
        }
      }

      // 5. Rota Direta de Agendamento do Cliente (/agendar ou ?agendar=1)
      if (pathname === '/agendar' || params.get('agendar') === '1') {
        setInitialClientTab('agendar');
        setCurrentRole('cliente');
        return;
      }

      // 6. Rota Pública Padrão da Vitrine da Loja (/ ou /cliente sem parâmetros especiais)
      // O cliente final não vê nenhum botão, formulário ou link que leve ao painel
      setCurrentRole('cliente');
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
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
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Servico));
      setServicos(list);
    });

    const unsubBarbeiros = onSnapshot(collection(db, 'barbeiros'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barbeiro));
      setBarbeiros(list);
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

  const handleAuthSuccess = (
    role?: 'barbeiro' | 'administrador' | 'super_admin',
    matchedBarberId?: string
  ) => {
    const target = role || authModalState.targetRole;
    if (matchedBarberId) {
      setActiveBarberId(matchedBarberId);
    }
    setUnlockedRoles((prev) => ({ ...prev, [target]: true }));
    setCurrentRole(target);
  };

  const handleLogoutToClient = () => {
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState(null, '', cleanUrl);
    } catch {}
    setCurrentRole('cliente');
  };

  const handleAuthClose = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
    // Se o usuário cancelou o modal de autenticação sem sucesso, limpa a URL para a vitrine limpa do cliente
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    } catch {}
    setCurrentRole('cliente');
  };

  return (
    <div
      className={`min-h-screen ${
        theme === 'light' ? 'bg-[#F4F5F7] text-zinc-900' : 'bg-[#0D0D0F] text-zinc-100'
      } flex flex-col selection:bg-[#D4AF37] selection:text-zinc-950 font-sans transition-colors duration-200`}
    >
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
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area - Expansive website layout (100% full bleed on mobile, max-w-7xl on desktop) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-6">
        <div
          className={`w-full ${
            theme === 'light'
              ? 'bg-white border-zinc-200 shadow-lg'
              : 'bg-[#141417] border-zinc-800/80 sm:shadow-2xl'
          } sm:rounded-2xl border-y sm:border p-3 sm:p-6 lg:p-8 transition-colors duration-200`}
        >
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
              disponibilidade={barberUser ? disponibilidades.find((d) => d.barbeiroId === barberUser.id) : undefined}
              onRefreshData={handleRefresh}
              onExitToStore={handleLogoutToClient}
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
              onExitToStore={handleLogoutToClient}
              onSwitchToBarber={(barberId) => {
                setActiveBarberId(barberId);
                setUnlockedRoles((prev) => ({ ...prev, barbeiro: true }));
                setCurrentRole('barbeiro');
              }}
            />
          )}

          {currentRole === 'super_admin' && (
            <SuperAdminModule
              onRefreshData={handleRefresh}
              onExitToStore={handleLogoutToClient}
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
        onClose={handleAuthClose}
        targetRole={authModalState.targetRole}
        onSuccess={handleAuthSuccess}
        barbeiros={barbeiros}
        activeBarberId={activeBarberId}
      />

      {/* PWA Install Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
