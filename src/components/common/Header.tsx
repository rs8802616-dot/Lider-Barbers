import React, { useState, useEffect } from 'react';
import { Crown, Bell, User, Scissors, ShieldAlert, ShieldCheck, Download, LogOut, Sun, Moon } from 'lucide-react';
import { UserRole, AppNotification } from '../../types';

export interface HeaderUser {
  role: UserRole;
  nome?: string;
  email?: string;
  isAdmin?: boolean;
}

export interface HeaderProps {
  /** Objeto de usuário com role e dados para renderização condicional baseada em perfil */
  user?: HeaderUser;
  /** Papel ativo do usuário (compatibilidade retroativa) */
  currentRole?: UserRole;
  /** Callback para alternância de perfil / rota */
  onRoleChange?: (role: UserRole) => void;
  /** Callback para retorno seguro à visão do cliente */
  onLogoutToClient?: () => void;
  /** Lista de notificações do app */
  notifications?: AppNotification[];
  /** Ação de abertura da central de notificações */
  onOpenNotifications?: () => void;
  /** Ação alternativa/fallback para instruções de instalação do PWA */
  onOpenInstall?: () => void;
  /** Nome ativo para exibição */
  activeUserName?: string;
  /** Nome customizado da barbearia (padrão: Líder Barbers) */
  barbeariaNome?: string;
  /** Tema ativo atual: 'dark' ou 'light' */
  theme?: 'dark' | 'light';
  /** Callback para alternar entre modo claro e escuro */
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentRole,
  onRoleChange,
  onLogoutToClient,
  notifications = [],
  onOpenNotifications,
  onOpenInstall,
  activeUserName,
  barbeariaNome = 'Líder Barbers',
  theme = 'dark',
  onToggleTheme,
}) => {
  // Papel do usuário logado (prioriza user.role conforme especificação)
  const activeRole: UserRole = user?.role || currentRole || 'cliente';
  const isCliente = activeRole === 'cliente';
  const unreadCount = notifications.filter((n) => !n.lida).length;

  // Lógica do Botão (PWA):
  // 1. O botão começa oculto por padrão
  const [mostrarBotaoInstalar, setMostrarBotaoInstalar] = useState(false);
  const [eventoInstalacao, setEventoInstalacao] = useState<any>(null);

  useEffect(() => {
    // 1. Verifica se JÁ está aberto dentro do aplicativo baixado (standalone)
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' &&
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    if (isStandalone) {
      setMostrarBotaoInstalar(false);
      return;
    }

    // Verifica se já havia um evento retido globalmente no window
    if (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt) {
      setEventoInstalacao((window as any).__pwaInstallPrompt);
      setMostrarBotaoInstalar(true);
    }

    // 2. O navegador avisa que o app pode ser baixado
    const segurarEventoInstalacao = (e: Event) => {
      e.preventDefault(); // Impede o navegador de mostrar a mensagem padrão dele
      if (typeof window !== 'undefined') {
        (window as any).__pwaInstallPrompt = e;
      }
      setEventoInstalacao(e); // Guarda o evento para usarmos no clique do botão
      setMostrarBotaoInstalar(true); // Mostra o NOSSO botão "Baixar o App"
    };

    // 3. O navegador avisa que o app acabou de ser instalado com sucesso
    const appFoiInstalado = () => {
      setMostrarBotaoInstalar(false); // Some com o botão na hora
      setEventoInstalacao(null);
      if (typeof window !== 'undefined') {
        (window as any).__pwaInstallPrompt = null;
      }
    };

    window.addEventListener('beforeinstallprompt', segurarEventoInstalacao);
    window.addEventListener('appinstalled', appFoiInstalado);

    return () => {
      window.removeEventListener('beforeinstallprompt', segurarEventoInstalacao);
      window.removeEventListener('appinstalled', appFoiInstalado);
    };
  }, []);

  // Função disparada ao clicar em "Baixar o App"
  const baixarApp = async () => {
    if (eventoInstalacao) {
      try {
        eventoInstalacao.prompt(); // Mostra o prompt nativo de instalação
        const { outcome } = await eventoInstalacao.userChoice;
        if (outcome === 'accepted') {
          setMostrarBotaoInstalar(false); // Se aceitou baixar, esconde o botão
        }
      } catch (err) {
        console.error('Erro na instalação do PWA:', err);
      }
      setEventoInstalacao(null);
      if (typeof window !== 'undefined') {
        (window as any).__pwaInstallPrompt = null;
      }
    } else if (onOpenInstall) {
      // Fallback para plataformas sem beforeinstallprompt (ex: iOS Safari)
      onOpenInstall();
    }
  };

  // Navegação entre áreas autorizadas
  const handleNavigate = (targetRole: UserRole, targetPath: string) => {
    if (onRoleChange) {
      onRoleChange(targetRole);
    }
    try {
      window.history.pushState(null, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      // No-op para ambientes de teste
    }
  };

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-4 py-2.5 sm:py-3 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* =========================================================================
            ELEMENTO PERMANENTE 1: Nome da Barbearia e Identidade da Marca
            Sempre visível em todas as telas e para todos os perfis.
           ========================================================================= */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              id="brand-logo-badge"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#997A23] p-[2px] shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center shrink-0"
            >
              <div className="w-full h-full bg-[#141417] rounded-[6px] flex items-center justify-center">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1
                  id="brand-name-heading"
                  className="text-sm sm:text-base md:text-lg font-bold tracking-wider text-zinc-100 uppercase font-display whitespace-nowrap"
                >
                  {barbeariaNome}
                </h1>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 tracking-widest uppercase">
                  PWA
                </span>

                {/* Badge de identificação do papel atual (se privilegiado) */}
                {activeRole === 'super_admin' && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider uppercase flex items-center gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Dono do App
                  </span>
                )}
                {activeRole === 'administrador' && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 tracking-wider uppercase whitespace-nowrap">
                    Administrador
                  </span>
                )}
                {activeRole === 'barbeiro' && (
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

        {/* =========================================================================
            LINKS BASEADOS EM PERFIS (ROLE-BASED) & ISOLAMENTO DE ACESSO:
            - Cliente Normal: NÃO visualiza nenhuma rota ou link administrativo.
            - Barbeiro: Acessa o link 'Barbeiro' (e 'Administrador' se for admin da unidade).
            - Administrador: Acessa os links 'Barbeiro' e 'Administrador'.
            - Dono do Aplicativo: Acessa 'Barbeiro', 'Administrador' e 'Dono do Aplicativo'.
           ========================================================================= */}
        {!isCliente && (
          <nav
            id="role-navigation-links"
            aria-label="Navegação Administrativa de Funções"
            className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl text-xs overflow-x-auto max-w-full"
          >
            {/* Link de Navegação: Barbeiro */}
            <button
              type="button"
              id="nav-link-barbeiro"
              onClick={() => handleNavigate('barbeiro', '/barbeiro')}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all text-xs font-semibold whitespace-nowrap ${
                activeRole === 'barbeiro'
                  ? 'bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/50 shadow-sm shadow-[#D4AF37]/10'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 border border-transparent'
              }`}
              title="Acessar painel e agenda do Barbeiro"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Barbeiro</span>
            </button>

            {/* Link de Navegação: Administrador (Visível para Admin, Dono ou Barbeiro-Admin) */}
            {(activeRole === 'administrador' ||
              activeRole === 'super_admin' ||
              Boolean(user?.isAdmin)) && (
              <button
                type="button"
                id="nav-link-administrador"
                onClick={() => handleNavigate('administrador', '/admin')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all text-xs font-semibold whitespace-nowrap ${
                  activeRole === 'administrador'
                    ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 border border-transparent'
                }`}
                title="Acessar painel do Administrador da Barbearia"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span>Administrador</span>
              </button>
            )}

            {/* Link de Navegação: Dono do Aplicativo (Exclusivo para Super Admin / Dono) */}
            {activeRole === 'super_admin' && (
              <button
                type="button"
                id="nav-link-dono-app"
                onClick={() => handleNavigate('super_admin', '/super-admin')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all text-xs font-bold whitespace-nowrap ${
                  activeRole === 'super_admin'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-amber-200 hover:bg-zinc-800/80 border border-transparent'
                }`}
                title="Acessar painel Master do Dono do Aplicativo"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Dono do Aplicativo</span>
              </button>
            )}

            {/* Botão para retornar ao modo cliente com segurança */}
            {onLogoutToClient && (
              <button
                type="button"
                id="btn-logout-to-client"
                onClick={onLogoutToClient}
                className="flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors font-medium text-[11px] whitespace-nowrap ml-1 border border-zinc-700/60"
                title="Sair do painel privilegiado e voltar para a visão de cliente"
              >
                <LogOut className="w-3 h-3 text-rose-400/80" />
                <span>Sair</span>
              </button>
            )}
          </nav>
        )}

        {/* =========================================================================
            AÇÕES DO CABEÇALHO:
            1. Botão PWA (Aparece apenas quando não instalado, some após baixar)
            2. Sino de Notificações (ELEMENTO PERMANENTE)
            3. Badge de Cliente (Apenas para clientes)
           ========================================================================= */}
        <div className="flex items-center justify-end flex-wrap gap-2 w-full sm:w-auto">
          {/* Lógica do Botão PWA: 'Baixar o App' */}
          {mostrarBotaoInstalar && (
            <button
              type="button"
              id="btn-pwa-install-header"
              onClick={baixarApp}
              className="flex items-center gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-[#B38F2E]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30 transition-all font-semibold shadow-sm whitespace-nowrap shrink-0 active:scale-[0.98]"
              title="Baixar e instalar o aplicativo Líder Barbers no seu dispositivo"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Baixar o App</span>
            </button>
          )}

          {/* ELEMENTO: Botão Alternador de Tema (Modo Claro / Modo Escuro) */}
          {onToggleTheme && (
            <button
              type="button"
              id="btn-theme-toggle"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-[#D4AF37] transition-all shrink-0 active:scale-95 flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-500" />
              )}
            </button>
          )}

          {/* ELEMENTO PERMANENTE 2: Ícone do Sino de Notificações */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-notifications-bell"
              aria-label="Notificações"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-[#D4AF37] transition-colors shrink-0"
              title="Notificações do Sistema"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  id="notifications-badge-count"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse"
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Identificação Segura do Cliente (Sem botões ou links para áreas administrativas) */}
          {isCliente && (
            <div
              id="client-identity-badge"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <User className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="font-medium text-zinc-200 max-w-[120px] truncate">
                {user?.nome || activeUserName || 'Cliente'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export const Cabecalho = Header;
export default Cabecalho;
