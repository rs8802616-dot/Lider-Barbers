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
                Líder Barbers
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 tracking-widest uppercase">
                PWA
              </span>
              {currentRole === 'super_admin' && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  Master
                </span>
              )}
              {currentRole === 'administrador' && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wider uppercase">
                  Admin Unidade
                </span>
              )}
              {currentRole === 'barbeiro' && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider uppercase">
                  Barbeiro
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#C5A059] tracking-widest font-medium uppercase">
              Estilo • Respeito • Liderança
            </p>
          </div>
        </div>

        {/* Controls: Install App, Push Notifications, Persona Display */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 w-full md:w-auto">
          {/* Baixar Aplicativo PWA */}
          <button
            type="button"
            onClick={onOpenInstall}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#B38F2E]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 transition-all font-semibold shadow-sm"
            title="Baixar e instalar o aplicativo Líder Barbers"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Baixar App</span>
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

          {/* User Status / Role View (Estrito isolamento: Clientes NÃO visualizam botões de Barbeiro/Admin) */}
          {currentRole === 'cliente' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <User className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-medium text-zinc-200">{activeUserName || 'Cliente'}</span>
            </div>
          ) : (
            /* Privileged User Controls: Shows active staff role and quick exit button */
            <div className="flex items-center gap-2 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-200">
                {currentRole === 'barbeiro' && <Scissors className="w-3.5 h-3.5 text-[#D4AF37]" />}
                {currentRole === 'administrador' && <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37]" />}
                {currentRole === 'super_admin' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                <span className="font-semibold text-xs text-[#D4AF37]">
                  {currentRole === 'barbeiro'
                    ? activeUserName
                    : currentRole === 'administrador'
                    ? 'Admin Barbearia'
                    : 'Master'}
                </span>
              </div>

              {onLogoutToClient && (
                <button
                  type="button"
                  onClick={onLogoutToClient}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors font-medium text-[11px]"
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
