import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Key, MessageCircle, ShieldCheck, UserCheck, X } from 'lucide-react';

interface GeneratedAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recipientName: string;
  recipientRole: 'administrador' | 'barbeiro';
  establishmentName?: string;
  accessUrl: string;
  pin?: string;
  phone?: string;
}

export const GeneratedAccessModal: React.FC<GeneratedAccessModalProps> = ({
  isOpen,
  onClose,
  title,
  recipientName,
  recipientRole,
  establishmentName = 'Líder Barbers',
  accessUrl,
  pin,
  phone,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(accessUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = accessUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleSendWhatsApp = () => {
    const roleLabel = recipientRole === 'administrador' ? 'Administrador' : 'Barbeiro';
    const message = `Olá, ${recipientName}! Seu acesso exclusivo como *${roleLabel}* da barbearia *${establishmentName}* foi gerado com sucesso!\n\n🔑 *Acesse seu painel pelo link abaixo:*\n${accessUrl}${
      pin ? `\n\n📌 *Sua senha/PIN de segurança:* ${pin}` : ''
    }\n\nGuarde este link nos seus favoritos para gerenciar seus atendimentos e clientes a qualquer momento.`;

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#18181b] border border-[#D4AF37]/50 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
            {recipientRole === 'administrador' ? (
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            ) : (
              <UserCheck className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 uppercase tracking-wider">
              Acesso Exclusivo Gerado
            </span>
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 font-display mt-0.5">
              {title}
            </h3>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-300">
            <span><strong>Destinatário:</strong> {recipientName}</span>
            <span className="text-[11px] text-[#C5A059] font-medium uppercase tracking-wider">
              {recipientRole === 'administrador' ? 'Gestão da Barbearia' : 'Agenda do Barbeiro'}
            </span>
          </div>
          {establishmentName && (
            <p className="text-zinc-400">
              <strong>Unidade/Barbearia:</strong> {establishmentName}
            </p>
          )}
          {pin && (
            <p className="text-zinc-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span><strong>Senha/PIN vinculada:</strong> <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 font-mono text-[11px]">{pin}</code></span>
            </p>
          )}
        </div>

        {/* URL Display Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">
            Link Exclusivo de Acesso Direto:
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono text-[#D4AF37] break-all select-all">
            <span className="flex-1 truncate">{accessUrl}</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Ao abrir este link, o sistema reconhece automaticamente o usuário e abre o painel correspondente sem botões ou menus na vitrine de clientes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all shadow-md"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Link Exclusivo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-[0.99] transition-all shadow-md shadow-emerald-950"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
