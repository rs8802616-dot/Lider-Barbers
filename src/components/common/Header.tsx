import React, { useState } from 'react';
import { Crown, Bell, User, Scissors, ShieldAlert, Sparkles, Download, LogOut, ShieldCheck } from 'lucide-react';
import { UserRole, AppNotification } from '../../types';
import { requestPushPermission, triggerBrowserNotification } from '../../services/notificationService';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onLogoutToClient?: () => void;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onOpenInstall: () => void;
  activeUserName: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onLogoutToClient,
  notifications,
  onOpenNotifications,
  onOpenInstall,
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
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Logo & Brand Identity */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#997A23] p-[2px] shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#141417] rounded-[6px] flex items-center justify-center">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-wider text-zinc-100 uppercase font-display whitespace-nowrap">
                  Líder Barbers
                </h1>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 tracking-widest uppercase">
                  PWA
                </span>
                {currentRole === 'super_admin' && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider uppercase flex items-center gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Master
                  </span>
                )}
                {currentRole === 'administrador' && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wider uppercase whitespace-nowrap">
                    Admin
                  </span>
                )}
                {currentRole === 'barbeiro' && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider uppercase whitespace-nowrap">
                    Barbeiro
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-[#C5A059] tracking-widest font-medium uppercase truncate">
                Estilo • Respeito • Liderança
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Install App, Push Notifications, Persona Display */}
        <div className="flex items-center justify-end flex-wrap gap-2 w-full sm:w-auto">
          {/* Baixar Aplicativo PWA */}
          <button
            type="button"
            onClick={onOpenInstall}
            className="flex items-center gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#B38F2E]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 transition-all font-semibold shadow-sm whitespace-nowrap shrink-0"
            title="Baixar e instalar o aplicativo Líder Barbers"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Baixar App</span>
            <span className="sm:hidden">App</span>
          </button>

          {/* Real Push Notification Toggle / Bell */}
          <div className="flex items-center gap-1.5 shrink-0">
            {pushStatus !== 'granted' && (
              <button
                type="button"
                onClick={handleEnablePush}
                className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                title="Ativar notificações push no dispositivo"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Push</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors shrink-0"
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

          {/* User Status / Role View */}
          {currentRole === 'cliente' ? (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <User className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="font-medium text-zinc-200 max-w-[120px] truncate">{activeUserName || 'Cliente'}</span>
            </div>
          ) : (
            /* Privileged User Controls: Shows active staff role and quick exit button */
            <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs shrink-0">
              <div className="flex items-center gap-1 px-2 py-0.5 sm:py-1 text-zinc-200">
                {currentRole === 'barbeiro' && <Scissors className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />}
                {currentRole === 'administrador' && <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />}
                {currentRole === 'super_admin' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                <span className="font-semibold text-xs text-[#D4AF37] max-w-[120px] truncate">
                  {currentRole === 'barbeiro'
                    ? activeUserName
                    : currentRole === 'administrador'
                    ? 'Admin'
                    : 'Master'}
                </span>
              </div>

              {onLogoutToClient && (
                <button
                  type="button"
                  onClick={onLogoutToClient}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors font-medium text-[11px] shrink-0"
                  title="Sair do painel e voltar para a visão do Cliente"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
