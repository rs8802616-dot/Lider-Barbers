import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Capture browser install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B38F2E] p-0.5 flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
              <img
                src="/icons/icon-192.png"
                alt="Líder Barbers"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            <div>
              <h3 className="text-base font-bold font-display tracking-wide">
                Baixar Aplicativo
              </h3>
              <p className="text-xs text-[#D4AF37]">Líder Barbers App Oficial</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isInstalled ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3">
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold">O aplicativo já está instalado!</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Você pode acessá-lo direto pela tela inicial do seu dispositivo.
              </p>
            </div>
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Instale o aplicativo da Líder Barbers no seu celular ou computador para agendamentos rápidos, lembretes automáticos e acesso direto na sua tela inicial, sem precisar abrir o navegador.
            </p>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F2E] text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-[#D4AF37]/20"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Aplicativo Agora</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Para baixar no <strong>iPhone ou iPad</strong>:
            </p>
            <div className="space-y-2 text-xs text-zinc-300 bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari</span>
              </div>
              <div className="flex items-center gap-2.5">
                <PlusSquare className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>2. Role as opções e selecione <strong>Adicionar à Tela de Início</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>3. Toque em <strong>Adicionar</strong> no canto superior direito</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              O aplicativo pode ser adicionado à tela inicial diretamente através do seu navegador (Google Chrome, Edge ou Safari):
            </p>
            <div className="space-y-2 text-xs text-zinc-300 bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
              <p>• Toque no menu do navegador (os <strong>três pontinhos</strong> no topo ou rodapé)</p>
              <p>• Escolha a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></p>
              <p>• O ícone da Líder Barbers será fixado no seu dispositivo</p>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
