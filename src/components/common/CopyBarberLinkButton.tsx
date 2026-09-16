import React, { useState } from 'react';
import { Copy, Check, Share2, Sparkles, ExternalLink } from 'lucide-react';

interface CopyBarberLinkButtonProps {
  barberSlug?: string;
  barberId: string;
  barberName: string;
  className?: string;
  variant?: 'compact' | 'card' | 'button';
}

export const CopyBarberLinkButton: React.FC<CopyBarberLinkButtonProps> = ({
  barberSlug,
  barberId,
  barberName,
  className = '',
  variant = 'button',
}) => {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Derive the link URL: use slug or fallback to barberId
  const identifier = barberSlug || barberId;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullInviteUrl = `${origin}/b/${identifier}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullInviteUrl);
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = fullInviteUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setShowToast(true);
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-xl bg-[#18181c] border border-zinc-800 space-y-3 relative overflow-hidden ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Share2 className="w-4 h-4 text-[#D4AF37]" />
            <span>Meu Link Exclusivo de Atendimento</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 font-medium">
            Convite Direto
          </span>
        </div>

        <p className="text-[11px] text-zinc-400">
          Compartilhe este link no seu Instagram, WhatsApp ou bio para os clientes agendarem direto com você ({barberName}).
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/70 text-xs font-mono text-zinc-300 truncate select-all">
            {fullInviteUrl}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              copied
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 hover:brightness-110 shadow-md shadow-[#D4AF37]/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Copiado! ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Meu Link</span>
              </>
            )}
          </button>
        </div>

        {showToast && (
          <div className="absolute top-2 right-2 text-[10px] px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-in fade-in">
            <Sparkles className="w-3 h-3" />
            <span>Link copiado com sucesso!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] shadow-sm whitespace-nowrap ${
          copied
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'bg-gradient-to-r from-[#D4AF37]/20 to-[#B38F2E]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30'
        } ${className}`}
        title={`Copiar link direto para agendamento com ${barberName}: ${fullInviteUrl}`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            <span className="text-emerald-300 font-semibold">Copiado! ✓</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Copiar Meu Link</span>
            <span className="sm:hidden">Meu Link</span>
          </>
        )}
      </button>

      {showToast && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 px-2.5 py-1 rounded bg-zinc-900 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold shadow-xl flex items-center gap-1 animate-in fade-in zoom-in-95">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Link copiado para a área de transferência!</span>
        </div>
      )}
    </div>
  );
};
