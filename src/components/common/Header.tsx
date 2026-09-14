import React, { useState } from 'react';
import { Crown, Bell, Smartphone, Monitor, User, Scissors, ShieldAlert, Sparkles } from 'lucide-react';
import { UserRole, AppNotification } from '../../types';
import { requestPushPermission, triggerBrowserNotification } from '../../services/notificationService';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isMobileDeviceView: boolean;
  onToggleDeviceView: () => void;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  activeUserName: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  isMobileDeviceView,
  onToggleDeviceView,
  notifications,
  onOpenNotifications,
  activeUserName,
}) => {
  const unreadCount = notifications.filter((n) => !n.lida).length;
  const [pushStatus, setPushStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const handleEnablePush = async () => {
    const res = await requestPushPermission();
    setPushStatus(res);
    if (res === 'granted') {
      triggerBrowserNotification(
        'Notificações Ativadas!',
        'Você receberá atualizações em tempo real sobre seus agendamentos.'
      );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#997A23] p-[2px] shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center">
            <div className="w-full h-full bg-[#141417] rounded-[6px] flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-zinc-100 uppercase font-display">
                Barbearia Liberdade
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 tracking-widest uppercase">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-[#C5A059] tracking-widest font-medium uppercase">
              Estilo • Respeito • Liberdade
            </p>
          </div>
        </div>

        {/* Controls: Persona Switcher, Push Bell, Device Mockup Toggle */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          {/* Device Mockup Toggle */}
          <button
            type="button"
            onClick={onToggleDeviceView}
            title={isMobileDeviceView ? 'Alternar para visão desktop completa' : 'Alternar para visual smartphone (mockup)'}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all border ${
              isMobileDeviceView
                ? 'bg-zinc-800 text-[#D4AF37] border-[#D4AF37]/40'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {isMobileDeviceView ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Modo Celular</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Amplo</span>
              </>
            )}
          </button>

          {/* Real Push Notification Toggle / Bell */}
          <div className="flex items-center gap-1">
            {pushStatus !== 'granted' && (
              <button
                type="button"
                onClick={handleEnablePush}
                className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                title="Ativar notificações push no dispositivo"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Ativar Push</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
              title="Central de Notificações em Tempo Real"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Role Persona Switcher (PRD Profiles: Cliente, Barbeiro, Administrador) */}
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => onRoleChange('cliente')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentRole === 'cliente'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('barbeiro')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentRole === 'barbeiro'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Barbeiro</span>
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('administrador')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentRole === 'administrador'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
