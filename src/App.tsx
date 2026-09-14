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
import { ClientModule } from './components/client/ClientModule';
import { BarberModule } from './components/barber/BarberModule';
import { AdminModule } from './components/admin/AdminModule';
import {
  registerServiceWorker,
  subscribeNotifications,
  triggerBrowserNotification,
} from './services/notificationService';
import { Wifi, Battery, Signal, Sparkles } from 'lucide-react';

export default function App() {
  // Active role: 'cliente' | 'barbeiro' | 'administrador'
  const [currentRole, setCurrentRole] = useState<UserRole>('cliente');

  // Device view mode: mobile frame view (like in prototype screenshot) vs full desktop view
  const [isMobileDeviceView, setIsMobileDeviceView] = useState<boolean>(true);

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

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-zinc-100 flex flex-col selection:bg-[#D4AF37] selection:text-zinc-950 font-sans">
      {/* Top Bar with Role Switcher & Controls */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        isMobileDeviceView={isMobileDeviceView}
        onToggleDeviceView={() => setIsMobileDeviceView(!isMobileDeviceView)}
        notifications={notifications}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        activeUserName={
          currentRole === 'cliente'
            ? clientUser.nome
            : currentRole === 'barbeiro'
            ? barberUser.nome
            : 'Administrador'
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 w-full">
        {isMobileDeviceView ? (
          /* Sleek Mobile Frame (Matches the prototype mockups from the image) */
          <div className="w-full max-w-[420px] rounded-[44px] bg-[#121212] border-[8px] border-[#222227] shadow-2xl shadow-black/80 overflow-hidden relative transition-all ring-1 ring-zinc-800">
            {/* Mobile Status Bar (9:41, icons) */}
            <div className="h-10 bg-[#121212] px-6 flex items-center justify-between text-[12px] font-semibold text-zinc-400 select-none border-b border-zinc-900/60">
              <span>9:41</span>
              <div className="w-24 h-4 bg-zinc-950 rounded-full mx-auto" />
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4" />
              </div>
            </div>

            {/* Inner Content Scroll Container */}
            <div className="p-4 sm:p-5 max-h-[82vh] overflow-y-auto">
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
          </div>
        ) : (
          /* Full Desktop View */
          <div className="w-full max-w-6xl mx-auto rounded-2xl bg-[#141417] border border-zinc-800/80 p-6 shadow-xl">
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
        )}
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
    </div>
  );
}
