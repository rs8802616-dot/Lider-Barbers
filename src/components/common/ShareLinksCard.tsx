import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Share2,
  Lock,
  Smartphone,
  Globe,
  ShieldCheck,
  Key,
  MessageCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface ShareLinksCardProps {
  role?: 'administrador' | 'super_admin' | 'barbeiro';
  barberSlug?: string;
  barberId?: string;
  barberName?: string;
  className?: string;
}

export const ShareLinksCard: React.FC<ShareLinksCardProps> = ({
  role = 'administrador',
  barberSlug,
  barberId,
  barberName,
  className = '',
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // URL base limpa
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const cleanStoreUrl = `${origin}${pathname}`;

  // Links específicos
  const linkLoja = cleanStoreUrl;
  const linkAdmin = `${cleanStoreUrl}?admin=1`;
  const linkAdminKey = `${cleanStoreUrl}?chave=admin123`;
  const linkMaster = `${cleanStoreUrl}?master=1`;
  const linkMasterKey = `${cleanStoreUrl}?chave=master123`;
  const linkBarberPanel = `${cleanStoreUrl}?barbeiro=1`;
  const linkBarberInvite = barberSlug || barberId ? `${cleanStoreUrl}b/${barberSlug || barberId}` : '';

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const openWhatsApp = (url: string, message: string) => {
    const text = encodeURIComponent(`${message}\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div
      id="share-links-card"
      className={`p-4 sm:p-5 rounded-2xl bg-[#161619] border border-zinc-800 shadow-xl space-y-5 ${className}`}
    >
      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-sm">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-display flex items-center gap-2">
              <span>Central de Links & Acesso Inteligente</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-sans font-bold border border-[#D4AF37]/30">
                Rotas por URL
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Zero botões de login para o cliente • Links exclusivos salváveis nos favoritos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#C5A059] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/20 w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Loja 100% Limpa</span>
        </div>
      </div>

      {/* Grid de Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* =========================================================================
            LINK 1: Link Público da Vitrine para Clientes (Instagram, Bio, WhatsApp)
           ========================================================================= */}
        <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                Link da Loja (Para Clientes)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30">
                Público
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Para divulgar no <strong>Instagram, Bio, WhatsApp e Google</strong>. O cliente acessa uma vitrine limpa, sem botões técnicos ou painéis.
            </p>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate select-all">
              {linkLoja}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(linkLoja, 'loja')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                copiedKey === 'loja'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              {copiedKey === 'loja' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link da Loja</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => openWhatsApp(linkLoja, '💈 Conheça e agende seu horário na Líder Barbers de forma rápida:')}
              className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
              title="Compartilhar no WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            <a
              href={linkLoja}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Abrir Loja Pública em Nova Aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* =========================================================================
            LINK 2: Link Exclusivo do Administrador / Lojista (Favoritos)
           ========================================================================= */}
        <div className="p-4 rounded-xl bg-[#18181b] border border-blue-500/30 hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-400" />
                Link Exclusivo do Lojista (Admin)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-medium border border-blue-500/30">
                Restrito (?admin=1)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              <strong>Salve nos favoritos do celular ou navegador</strong>. Abre diretamente a tela de gestão protegida por senha.
            </p>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate select-all">
              {linkAdmin}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(linkAdmin, 'admin')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                copiedKey === 'admin'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
              }`}
            >
              {copiedKey === 'admin' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link Admin (?admin=1)</span>
                </>
              )}
            </button>

            <a
              href={linkAdmin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Testar Link em Nova Aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* =========================================================================
            LINK 3: Link Seguro com Chave / Token (Login Direto sem Redigitar Senha)
           ========================================================================= */}
        <div className="p-4 rounded-xl bg-[#18181b] border border-amber-500/30 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                Link com Chave Secreta (Acesso Rápido)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium border border-amber-500/30">
                Token (?chave=admin123)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Desbloqueia e entra no painel <strong>automaticamente</strong> sem pedir PIN. Uso pessoal e confidencial.
            </p>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate select-all">
              {linkAdminKey}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(linkAdminKey, 'key')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                copiedKey === 'key'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 shadow-md shadow-[#D4AF37]/20 hover:brightness-110'
              }`}
            >
              {copiedKey === 'key' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link com Chave</span>
                </>
              )}
            </button>

            <a
              href={linkAdminKey}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Testar Link com Chave"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* =========================================================================
            LINK 4: Link do Dono Master ou Link da Agenda do Barbeiro
           ========================================================================= */}
        {role === 'super_admin' ? (
          <div className="p-4 rounded-xl bg-[#18181b] border border-amber-500/40 hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Link Exclusivo do Dono do App (Master)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/40">
                  ?master=1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Acesse o painel Super Admin multi-unidades pelo parâmetro exclusivo <code>?master=1</code>.
              </p>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate select-all">
                {linkMaster}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(linkMaster, 'master')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                  copiedKey === 'master'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20'
                }`}
              >
                {copiedKey === 'master' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link Master (?master=1)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(linkMasterKey, 'masterKey')}
                className="px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold transition-colors"
                title="Copiar com Chave Master Direta (?chave=master123)"
              >
                {copiedKey === 'masterKey' ? 'Copiado!' : 'Chave Master'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#18181b] border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                  Link da Agenda do Barbeiro
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] font-medium border border-[#D4AF37]/30">
                  ?barbeiro=1
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Os barbeiros podem salvar este link nos favoritos para abrir a agenda de atendimentos individual.
              </p>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate select-all">
                {linkBarberPanel}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(linkBarberPanel, 'barberPanel')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                  copiedKey === 'barberPanel'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
              >
                {copiedKey === 'barberPanel' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link Barbeiro (?barbeiro=1)</span>
                  </>
                )}
              </button>

              <a
                href={linkBarberPanel}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Abrir Painel do Barbeiro"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Dica Prática de Uso */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-2.5 text-xs text-zinc-400">
        <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-300">Como funciona na prática:</strong> O cliente que acessa o link normal nunca vê o botão de login ou áreas restritas da barbearia. O administrador e os profissionais usam os links exclusivos com parâmetros (ex: <code>?admin=1</code> ou <code>?chave=...</code>) e podem salvá-los como atalho na tela inicial do celular como se fossem aplicativos separados!
        </p>
      </div>
    </div>
  );
};
