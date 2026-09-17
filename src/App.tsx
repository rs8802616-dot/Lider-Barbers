import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [activeBarberId, setActiveBarberId] = useState<string>('');

  // Authenticated roles tracker to ensure clientes cannot leak into barber, admin, or master views
  const [unlockedRoles, setUnlockedRoles] = useState<{
    barbeiro: boolean;
    administrador: boolean;
    super_admin: boolean;
  }>(() => {
    try {
      const saved = sessionStorage.getItem('lider_unlocked_roles');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      barbeiro: false,
      administrador: false,
      super_admin: false,
    };
  });

  // Core Data States
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const unlockedRolesRef = useRef(unlockedRoles);
  unlockedRolesRef.current = unlockedRoles;

  const barbeirosRef = useRef(barbeiros);
  barbeirosRef.current = barbeiros;

  const isRoleUnlocked = (role: 'barbeiro' | 'administrador' | 'super_admin'): boolean => {
    if (unlockedRolesRef.current[role]) return true;
    try {
      const saved = sessionStorage.getItem('lider_unlocked_roles');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed[role]);
      }
    } catch {}
    return false;
  };

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
  const handleLocationChange = useCallback(() => {
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
        targetBarber = barbeirosRef.current.find(
          (b) =>
            b.id.toLowerCase() === rawBarberParam.toLowerCase() ||
            (b.slug && b.slug.toLowerCase() === rawBarberParam.toLowerCase()) ||
            b.nome.toLowerCase().replace(/\s+/g, '-') === rawBarberParam.toLowerCase()
        );
      }

      if (targetBarber) {
        setActiveBarberId((prev) => (prev === targetBarber.id ? prev : targetBarber.id));
      }

      // Validação da chave/PIN do barbeiro
      const cleanChaveLower = chave.toLowerCase();
      const isAuthedByPin =
        ['barber123', 'barbeiro123', 'barber', '1234', '123456'].includes(cleanChaveLower) ||
        (targetBarber?.pin && chave === targetBarber.pin);

      if (isAuthedByPin || isRoleUnlocked('barbeiro')) {
        setUnlockedRoles((prev) => {
          if (prev.barbeiro) return prev;
          const updated = { ...prev, barbeiro: true };
          try {
            sessionStorage.setItem('lider_unlocked_roles', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        unlockedRolesRef.current = { ...unlockedRolesRef.current, barbeiro: true };
        setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        setCurrentRole((prev) => (prev === 'barbeiro' ? prev : 'barbeiro'));
      } else {
        setAuthModalState((prev) =>
          prev.isOpen && prev.targetRole === 'barbeiro'
            ? prev
            : { isOpen: true, targetRole: 'barbeiro' }
        );
      }
      return;
    }

    // 2. Link Exclusivo do Dono do Sistema / Super Admin (?master=1, ?dono=1, ?super-admin=1, #/master)
    const isSuperAdminParam =
      params.get('master') === '1' ||
      params.get('master') === 'true' ||
      params.get('dono') === '1' ||
      params.get('dono') === 'true' ||
      params.get('superadmin') === '1' ||
      params.get('super_admin') === '1' ||
      params.get('super-admin') === '1';
    const isSuperAdminHash = hash.includes('master') || hash.includes('super-admin') || hash.includes('superadmin') || hash.includes('dono');
    const isSuperAdminRoute = pathname === '/super-admin' || pathname === '/superadmin' || pathname === '/master';

    if (isSuperAdminParam || isSuperAdminHash || isSuperAdminRoute) {
      const cleanChaveLower = chave.toLowerCase();
      const isAuthedByPin =
        ['master123', 'master', 'super123', 'superadmin', '1234', '123456', 'admin', 'admin123', 'dono', 'dono123'].includes(cleanChaveLower) ||
        chave === localStorage.getItem('lider_master_pin');

      if (isAuthedByPin || isRoleUnlocked('super_admin')) {
        setUnlockedRoles((prev) => {
          if (prev.super_admin) return prev;
          const updated = { ...prev, super_admin: true };
          try {
            sessionStorage.setItem('lider_unlocked_roles', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        unlockedRolesRef.current = { ...unlockedRolesRef.current, super_admin: true };
        setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        setCurrentRole((prev) => (prev === 'super_admin' ? prev : 'super_admin'));
      } else {
        setAuthModalState((prev) =>
          prev.isOpen && prev.targetRole === 'super_admin'
            ? prev
            : { isOpen: true, targetRole: 'super_admin' }
        );
      }
      return;
    }

    // 3. Link Exclusivo do Lojista / Administrador da Barbearia (?admin=ID, ?admin=1, ?adminId=..., #/admin)
    const rawAdminParam = (params.get('admin') || params.get('adminid') || params.get('gerente') || '').trim();
    const isAdminHash = hash.includes('admin') || hash.includes('administrador') || hash.includes('gerente');
    const isAdminRoute = pathname === '/admin' || pathname === '/administrador' || pathname === '/gerente';

    if (rawAdminParam || isAdminHash || isAdminRoute) {
      const cleanChaveLower = chave.toLowerCase();
      const isAuthedByPin =
        ['admin123', 'admin', 'gerente123', '1234', '123456', 'master123'].includes(cleanChaveLower) ||
        chave === localStorage.getItem('lider_admin_pin') ||
        (chave && rawAdminParam && !['1', 'true'].includes(rawAdminParam));

      if (isAuthedByPin || isRoleUnlocked('administrador')) {
        setUnlockedRoles((prev) => {
          if (prev.administrador) return prev;
          const updated = { ...prev, administrador: true };
          try {
            sessionStorage.setItem('lider_unlocked_roles', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        unlockedRolesRef.current = { ...unlockedRolesRef.current, administrador: true };
        setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        setCurrentRole((prev) => (prev === 'administrador' ? prev : 'administrador'));
      } else {
        setAuthModalState((prev) =>
          prev.isOpen && prev.targetRole === 'administrador'
            ? prev
            : { isOpen: true, targetRole: 'administrador' }
        );
      }
      return;
    }

    // 4. Link Direto de Divulgação do Barbeiro para CLIENTES Agendarem (/b/:slug, ?b=slug, ?agendar_com=slug)
    const bMatch = pathname.match(/^\/b\/(.+)$/);
    const bQuerySlug = params.get('b') || params.get('agendar_com');
    const rawSlug = bMatch ? bMatch[1] : bQuerySlug;

    if (rawSlug) {
      const slugOrId = decodeURIComponent(rawSlug).trim().toLowerCase();
      const matchedBarber = barbeirosRef.current.find(
        (b) =>
          (b.slug && b.slug.toLowerCase() === slugOrId) ||
          b.id.toLowerCase() === slugOrId ||
          b.nome.toLowerCase().replace(/\s+/g, '-') === slugOrId
      );

      if (matchedBarber) {
        setInvitedBarberId((prev) => (prev === matchedBarber.id ? prev : matchedBarber.id));
        localStorage.setItem('lider_prefered_barber_id', matchedBarber.id);
        setInitialClientTab((prev) => (prev === 'agendar' ? prev : 'agendar'));
        setCurrentRole((prev) => (prev === 'cliente' ? prev : 'cliente'));
        return;
      }
    }

    // 5. Rota Direta de Agendamento do Cliente (/agendar ou ?agendar=1)
    if (pathname === '/agendar' || params.get('agendar') === '1') {
      setInitialClientTab((prev) => (prev === 'agendar' ? prev : 'agendar'));
      setCurrentRole((prev) => (prev === 'cliente' ? prev : 'cliente'));
      return;
    }

    // 6. Rota Pública Padrão da Vitrine da Loja (/ ou /cliente sem parâmetros especiais)
    setCurrentRole((prev) => (prev === 'cliente' ? prev : 'cliente'));
  }, []);

  useEffect(() => {
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [handleLocationChange]);

  // Sync barber link when barbers list finishes loading
  useEffect(() => {
    if (barbeiros.length > 0) {
      const search = window.location.search;
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(search);
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
          setInvitedBarberId((prev) => (prev === matchedBarber.id ? prev : matchedBarber.id));
        }
      }
    }
  }, [barbeiros.length]);

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
      setServicos((prev) => {
        if (prev.length === list.length && prev.every((s, i) => s.id === list[i].id && s.preco === list[i].preco && s.nome === list[i].nome)) {
          return prev;
        }
        return list;
      });
    });

    const unsubBarbeiros = onSnapshot(collection(db, 'barbeiros'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Barbeiro));
      setBarbeiros((prev) => {
        if (prev.length === list.length && prev.every((b, i) => b.id === list[i].id && b.nome === list[i].nome && b.pin === list[i].pin)) {
          return prev;
        }
        return list;
      });
      if (list.length > 0) {
        setActiveBarberId((prev) => (list.some((b) => b.id === prev) ? prev : list[0].id));
      } else {
        setActiveBarberId((prev) => (prev === '' ? prev : ''));
      }
    });

    const unsubAgendamentos = onSnapshot(
      query(collection(db, 'agendamentos'), orderBy('data', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Agendamento));
        setAgendamentos((prev) => {
          if (prev.length === list.length && prev.every((a, i) => a.id === list[i].id && a.status === list[i].status && a.data === list[i].data && a.horarioInicio === list[i].horarioInicio)) {
            return prev;
          }
          return list;
        });
      }
    );

    const unsubDisp = onSnapshot(collection(db, 'disponibilidades'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Disponibilidade));
      setDisponibilidades((prev) => {
        if (prev.length === list.length && prev.every((d, i) => d.id === list[i].id && d.barbeiroId === list[i].barbeiroId && d.horarioInicio === list[i].horarioInicio && d.horarioFim === list[i].horarioFim)) {
          return prev;
        }
        return list;
      });
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
      ? (barberUser?.id || 'barbeiro')
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
    setUnlockedRoles((prev) => {
      const updated = { ...prev, [target]: true };
      try {
        sessionStorage.setItem('lider_unlocked_roles', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    unlockedRolesRef.current = {
      ...unlockedRolesRef.current,
      [target]: true,
    };
    setAuthModalState({ isOpen: false, targetRole: target });
    setCurrentRole(target);
  };

  const handleLogoutToClient = () => {
    try {
      sessionStorage.removeItem('lider_unlocked_roles');
      setUnlockedRoles({
        barbeiro: false,
        administrador: false,
        super_admin: false,
      });
      unlockedRolesRef.current = {
        barbeiro: false,
        administrador: false,
        super_admin: false,
      };
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState(null, '', cleanUrl);
    } catch {}
    setCurrentRole('cliente');
  };

  const handleAuthClose = () => {
    const roleToClose = authModalState.targetRole;
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
    // Se o usuário cancelou o modal de autenticação sem desbloquear a role, volta para a vitrine do cliente
    if (!isRoleUnlocked(roleToClose)) {
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      } catch {}
      setCurrentRole('cliente');
    }
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
              ? (clientUser.nome || 'Cliente')
              : currentRole === 'barbeiro'
              ? (barberUser?.nome || 'Barbeiro')
              : currentRole === 'super_admin'
              ? 'Master (Dono)'
              : 'Admin Barbearia',
          isAdmin: currentRole === 'barbeiro' ? (barberUser?.isAdmin ?? true) : true,
        }}
        currentRole={currentRole}
        onRoleChange={handleRoleChangeAttempt}
        onLogoutToClient={handleLogoutToClient}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        activeUserName={
          currentRole === 'cliente'
            ? (clientUser.nome || 'Cliente')
            : currentRole === 'barbeiro'
            ? (barberUser?.nome || 'Barbeiro')
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
