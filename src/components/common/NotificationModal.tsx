import React from 'react';
import { X, Bell, CheckCheck, Send, Volume2, Sparkles, Clock } from 'lucide-react';
import { AppNotification } from '../../types';
import {
  markNotificationAsRead,
  triggerBrowserNotification,
  requestPushPermission,
  sendNotification,
} from '../../services/notificationService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUserId: string;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserId,
}) => {
  if (!isOpen) return null;

  const handleTestPush = async () => {
    await requestPushPermission();
    await sendNotification(
      currentUserId,
      'Barbearia Liberdade • Notificação Push',
      'Lembrete: Seu atendimento está confirmado e o barbeiro já está te aguardando!',
      'lembrete'
    );
  };

  const handleMarkAllAsRead = async () => {
    for (const notif of notifications.filter((n) => !n.lida)) {
      await markNotificationAsRead(notif.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 font-display">
                Notificações em Tempo Real
              </h3>
              <p className="text-xs text-zinc-400">Push e avisos no dispositivo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="py-3 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={handleTestPush}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-zinc-950 font-semibold hover:bg-[#E5C378] transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Testar Notificação Push</span>
          </button>

          {notifications.some((n) => !n.lida) && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todas lidas</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D4AF37]" />
              <p>Nenhuma notificação no momento.</p>
              <p className="text-xs mt-1 text-zinc-600">
                Você receberá notificações instantâneas a cada novo agendamento ou alteração de status.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.lida && markNotificationAsRead(notif.id)}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  notif.lida
                    ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400'
                    : 'bg-zinc-900 border-[#D4AF37]/30 text-zinc-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        notif.lida ? 'bg-zinc-600' : 'bg-[#D4AF37]'
                      }`}
                    />
                    <h4 className="text-xs font-semibold text-zinc-100">{notif.titulo}</h4>
                  </div>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(notif.dataCriacao).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs mt-1 text-zinc-300 leading-relaxed">{notif.mensagem}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Alerta sonoro ativo</span>
          </div>
          <span>PWA Push Habilitado</span>
        </div>
      </div>
    </div>
  );
};
