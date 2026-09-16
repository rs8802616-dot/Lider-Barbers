# Documentação Oficial do Projeto - Líder Barbers

> **Aviso Importante para a IA e Desenvolvedores:**
> Este arquivo registra a arquitetura real, o estado atual das funcionalidades, as regras de segurança e o histórico de alterações do projeto **Líder Barbers**.
> **Você (a IA) DEVE ler este arquivo antes de executar qualquer alteração subsequente** solicitada pelo usuário para partir do estado real do projeto e nunca de suposições. Ao término de cada alteração, atualize este arquivo com as implementações realizadas.

---

## 1. Identidade e Propósito do Projeto
- **Nome da Marca:** Líder Barbers
- **Slogan:** Estilo • Respeito • Liderança
- **Cores Primárias:** Ouro Envelhecido/Dourado (`#D4AF37`, `#B38F2E`, `#997A23`) e Preto Grafite (`#121212`, `#141417`, `#0D0D0F`).
- **Público e Papéis de Acesso (RBAC):**
  1. **Clientes (`cliente`):** Agendamento online em tempo real, seleção de profissional, acompanhamento e cancelamento seguro de agendamentos. **Não visualizam seletores de Barbeiro/Admin** na navegação principal nem dados financeiros do negócio.
  2. **Barbeiros (`barbeiro`):** Gestão de sua própria agenda, clientes agendados com ele, configuração de sua disponibilidade de horários e nova aba **"Meus Ganhos"** com extrato individual e cálculo de comissões (60% de repasse) estritamente isolado de outros profissionais.
  3. **Administradores de Barbearia (`administrador`):** Gestão operacional da unidade, equipe de barbeiros locais, catálogo de serviços e faturamento geral da barbearia.
  4. **Super Admin / Master (`super_admin`):** Exclusivo para o **Dono do Aplicativo**. Permite cadastrar barbearias/unidades multi-tenant, cadastrar e revogar administradores vinculados a cada barbearia, e monitorar o ecossistema geral da plataforma.

---

## 2. Arquitetura e Tecnologias
- **Frontend:** React 18+ com TypeScript e Vite.
- **Estilização:** Tailwind CSS (tema dark sofisticado com detalhes dourados).
- **Ícones:** `lucide-react`.
- **Animações / Efeitos:** `canvas-confetti` para confirmação de agendamentos.
- **Banco de Dados & Backend:** Firebase Firestore (com fallback resiliente para mock seguro caso o banco ainda não esteja provisionado ou ocorram erros de rede).
- **Notificações:** Service Worker com Web Push Notification e Notificações In-App em tempo real.
- **PWA (Progressive Web App):**
  - Manifesto Web: `/public/manifest.json` com nome "Líder Barbers", `theme_color` `#121212`, ícones PNG 192x192 e 512x512, e `display: standalone`.
  - Service Worker: `/public/sw.js` com cache offline de assets e handler de push notification.
  - Modal de Instalação: `/src/components/common/InstallPwaModal.tsx` com suporte nativo ao evento `beforeinstallprompt` (Android/Chrome/Edge) e guia passo-a-passo para iOS Safari (Adicionar à Tela de Início).

---

## 3. Segurança e Separação Estrita de Acessos (RBAC Anti-Vazamento)
### Diretriz Estrita de Visibilidade:
1. **Ocultação Absoluta no Cabeçalho para Clientes:**
   - Para o perfil `cliente`, os seletores/botões de "Barbeiro" e "Admin" foram **completamente removidos** do cabeçalho (`Header.tsx`). O cliente visualiza apenas seu nome, botão de "Baixar App" e sino de notificações.
   - O layout se ajusta dinamicamente e sem quebras visuais ou espaços vazios.
   - Acesso da equipe: pode ser acessado de forma discreta na aba "Perfil" do cliente através do botão "Área da Equipe", solicitando o PIN/senha correspondente.
2. **Painel Master (Super Admin):**
   - Módulo exclusivo (`/src/components/superadmin/SuperAdminModule.tsx`).
   - Gerencia unidades de barbearias e cadastro de novos administradores (`nome`, `email`, `senha`, `barbeariaId`, `telefone`).
   - Acesso protegido por credencial Master (`master123`, `super123` ou `1234`).
3. **Visão de Faturamento Individual do Barbeiro ("Meus Ganhos"):**
   - Nova aba no `BarberModule.tsx`.
   - Isolamento total: calcula faturamento bruto, comissões individuais (60%) e histórico exclusivamente dos agendamentos atribuídos àquele profissional.
   - O barbeiro não tem acesso ao faturamento global nem às métricas de outros colegas de barbearia.
4. **Botão de Saída / Logout para Profissionais e Gestores:**
   - O cabeçalho inclui um botão **"Sair"** quando em modo Barbeiro, Admin ou Master, retornando instantaneamente para a visão do Cliente de forma segura.

---

## 4. Recursos PWA e Instalação do Aplicativo
1. **Botão de Download no Topo:**
   - Adicionado botão destacado **"Baixar App"** no cabeçalho (`Header.tsx`) para permitir que o usuário baixe o aplicativo no celular ou computador a qualquer momento.
2. **Ícones PWA Homologados:**
   - `/public/icons/icon-192.png`: 192x192 PNG válido.
   - `/public/icons/icon-512.png`: 512x512 PNG válido (suporte padrão e maskable).
   - `/public/icons/icon.svg`: Vetorial oficial da marca Líder Barbers.
3. **Instalação Multiplataforma:**
   - Dispositivos Android/PC (Chrome/Edge): Aciona o prompt nativo de instalação através do `beforeinstallprompt`.
   - Dispositivos iOS (iPhone/iPad): Exibe instruções detalhadas de como usar o menu "Compartilhar" -> "Adicionar à Tela de Início" no Safari.

---

## 5. Histórico de Versões e Alterações

### Versão 1.3 (Sessão Atual - Super Admin, Faturamento Individual do Barbeiro & RBAC Refinado)
- **Remoção de Controles Staff do Header para Clientes:** Removidos totalmente botões de Barbeiro/Admin do topo quando o usuário está na visão de cliente.
- **Implementação do Módulo Super Admin (`SuperAdminModule.tsx`):**
  - Painel exclusivo para o Dono do App.
  - Cadastro de administradores e vínculo com barbearias / unidades multi-tenant.
  - Listagem, busca e revogação de acessos administrativos.
- **Implementação da Aba "Meus Ganhos" no Módulo do Barbeiro (`BarberModule.tsx`):**
  - KPI cards de comissão acumulada, comissão do dia, faturamento bruto pessoal e cortes concluídos.
  - Extrato detalhado individual com cálculo automático da comissão profissional.
- **Reforço de Segurança:**
  - Adicionadas regras no `firestore.rules` para as coleções `barbearias` e `administradores_barbearia`.
  - Desbloqueio seguro no `AuthModal.tsx` suportando as 3 funções privilegiadas (Barbeiro, Admin, Master).
  - Botão "Sair" no Header para voltar à visão do cliente.

### Versão 1.2 (Segurança, PWA e Documentação)
- Criação da documentação viva `DOCUMENTACAO-PROJETO.md`.
- Implementação inicial de PWA e modal de download/instalação.

### Versão 1.1 (Responsividade & Rebranding)
- Remoção total da moldura de celular (simulação mobile) no desktop.
- Layout 100% fluido e responsivo para monitores grandes, tablets e smartphones reais.
- Rebranding completo para **Líder Barbers** com tipografia Cinzel e Montserrat.
- Integração de notificações Web Push reais e sincronização de dados via Firebase Firestore.

### Versão 1.1 (Sessão Anterior - Responsividade & Rebranding)
- Remoção total da moldura de celular (simulação mobile) no desktop.
- Layout 100% fluido e responsivo para monitores grandes, tablets e smartphones reais.
- Rebranding completo para **Líder Barbers** com tipografia Cinzel e Montserrat.
- Integração de notificações Web Push reais e sincronização de dados via Firebase Firestore.

### Versão 1.4 (Links Personalizados de Barbeiro, Roteamento Dinâmico & Flexibilidade Admin-Barbeiro)
- **Links Exclusivos por Barbeiro (`/b/:slug` ou `/barbeiro/:slug`):**
  - Cada barbeiro possui um slug exclusivo (ex: `carlos-machado`, `marcos-vinicius`, `diego-santos`).
  - Implementado o botão `CopyBarberLinkButton` nos cards de barbeiro do Admin e no painel do Barbeiro, permitindo copiar o link direto com 1 clique (com fallback seguro e feedback visual via toast/tooltip).
  - Roteamento dinâmico no `App.tsx` que detecta a URL `/b/:slug`, identifica o profissional correspondente no Firestore e redireciona o cliente para o fluxo de agendamento com aquele barbeiro pré-selecionado.
  - O cliente visualiza um banner de destaque ("Você acessou o link exclusivo de [Nome]") e pode, a qualquer momento, clicar no botão **"Trocar barbeiro"** para escolher outro profissional caso queira.
- **Permissões Flexíveis (Administrador que também atende como Barbeiro):**
  - O modelo de dados `Barbeiro` agora suporta os atributos `slug`, `email` e `isAdmin: boolean`.
  - Barbeiros com perfil de Admin possuem no seu painel o botão de alternância rápida **"Modo Administrador"**.
  - No módulo do Administrador (`AdminModule.tsx`), o gestor que também atende possui o botão **"Abrir Minha Agenda"** / **"Modo Barbeiro"**, alternando de forma fluida entre a visão de gestão da barbearia e a sua agenda de atendimento sem deslogar ou vazar a visão do cliente.
- **Roteamento Limpo e Direto da Aplicação:**
  - `/` ou `/cliente`: Visão padrão do cliente.
  - `/b/:slug` ou `/barbeiro/:slug`: Agendamento direto com o barbeiro específico.
  - `/agendar`: Abertura imediata do fluxo de agendamento.
  - `/admin`: Acesso ao painel administrativo da barbearia (com senha).
  - `/super-admin` ou `/master`: Acesso ao painel do dono do app (com senha).

### Versão 1.5 (Refatoração do Cabeçalho: Lógica PWA Automática, Links Baseados em Perfis & Isolamento Estrito)
- **Elementos Permanentes:** O Nome da Barbearia ("Líder Barbers") e o Sino de Notificações com badge de não lidas estão sempre presentes no topo em qualquer tela ou estado de autenticação.
- **Lógica Reativa de Instalação PWA:**
  - O botão "Baixar o App" inicia oculto por padrão (`mostrarBotaoInstalar = false`).
  - No `useEffect`, verifica `display-mode: standalone`. Se o app já estiver instalado e em execução standalone, o botão não é exibido.
  - O evento nativo `beforeinstallprompt` do navegador é interceptado, armazenando a referência e ativando a exibição do botão.
  - Ao clicar no botão, o prompt nativo do sistema é exibido. Caso aceito (`outcome === 'accepted'`) ou assim que o evento `appinstalled` for disparado, o botão é imediatamente ocultado.
- **Links de Navegação Baseados em Perfis (Role-based):**
  - Barra de links dinâmicos no cabeçalho avaliando `user.role` / `currentRole`:
    - **Barbeiro:** Visualiza link para o painel de atendimento "Barbeiro" (e "Administrador" se tiver permissão mista) e botão "Sair".
    - **Administrador:** Visualiza links para "Barbeiro" e "Administrador", além do botão "Sair".
    - **Dono do Aplicativo:** Visualiza links para "Barbeiro", "Administrador" e "Dono do Aplicativo", além do botão "Sair".
- **Isolamento de Acesso Total para Clientes:**
  - Usuários no perfil de cliente têm zero rotas, links de barbeiro, admin ou dono no cabeçalho.
  - O cliente visualiza estritamente os elementos essenciais: Nome da Barbearia, Sino de Notificações, botão "Baixar o App" (se aplicável) e seu identificador de perfil.

### Versão 1.6 (Suporte a Modo Claro e Modo Escuro + Diagnóstico de Atualização da Tela)
- **Diagnóstico da Atualização da Tela:**
  - No ambiente de desenvolvimento do Google AI Studio, o HMR (*Hot Module Replacement*) instantâneo a cada tecla é desativado propositalmente (`DISABLE_HMR=true`) enquanto o agente edita o código em múltiplos arquivos. Isso evita travamentos, telas brancas e piscadas intermediárias. A prévia é atualizada assim que o turno do assistente finaliza. O servidor de desenvolvimento foi reiniciado com sucesso para reestabelecer o processo e a comunicação do Vite.
- **Modo Claro e Modo Escuro (Dark & Light Mode) — Pronto para Produção:**
  - Adicionado botão alternador no Cabeçalho (`#btn-theme-toggle`), alternando dinamicamente entre o ícone de Sol (☀️ para ativar modo claro) e Lua (🌙 para ativar modo escuro).
  - Provedor global `ThemeProvider` em `src/context/ThemeContext.tsx` com persistência no `localStorage` (`lider_theme`).
  - **Correção e Refinamento do Modo Claro para Produção:**
    - Mapeamento integral de todos os containers, cards de serviços, cards de barbeiros, caixas de métricas, calendários e caixas modais para fundo branco `#FFFFFF` com bordas sutis `#E2E8F0`.
    - O Hero Banner no modo claro agora exibe um design luxuoso em gradiente champanhe dourado suave (`#FFFDF8` a `#F4EBDA`), com tipografia espresso de alto contraste (`#1E1B13`) e botões dourados preservados.
    - Badges de status (Confirmado, Em Atendimento, Agendado, Cancelado) ajustados para tons claros elegantes e legíveis.
    - Barra de navegação inferior mobile adaptada para branco com desfoque de fundo (`rgba(255, 255, 255, 0.96)`).
    - Tipografia calibrada rigorosamente para conformidade com contraste WCAG AA (`#0F172A`, `#1E293B`, `#475569`).
  - No Modo Escuro: experiência de luxo noturna com fundo carvão `#0D0D0F`, superfícies `#141417`, acentos dourados e texto claro.

### Versão 1.7 (Arquitetura de Acesso Oculto por Parâmetros de URL & Vitrine 100% Limpa)
- **Vitrine Pública do Cliente 100% Limpa (`https://seusite.com/`):**
  - O sistema detecta a ausência de parâmetros de controle e exibe apenas a vitrine pública de agendamento de serviços.
  - Zero botões visíveis de "Login", "Área Restrita", "Acesso da Equipe" ou formulários técnicos no cabeçalho, rodapé ou tela de perfil do cliente.
  - Experiência fluida e focada exclusivamente na conversão de agendamentos para quem compra ou agenda.
- **Acesso Administrativo e de Barbeiros por Parâmetros de URL (Query Params & Hash):**
  - **Link Exclusivo do Lojista (Admin):** `?admin=1`, `?admin=true` ou `#/admin` — abre imediatamente a tela de login/painel administrativo protegido por PIN/senha (`admin123`).
  - **Link Exclusivo do Dono do App (Master):** `?master=1`, `?dono=1` ou `#/master` — abre o painel Super Admin multi-unidades com autenticação Master (`master123`).
  - **Link Exclusivo da Agenda do Barbeiro:** `?barbeiro=1` ou `#/barbeiro` — abre diretamente o painel de atendimentos do profissional com senha (`barber123`).
  - **Links com Token Seguro / Chave Secreta (`?chave=...` ou `?token=...`):**
    - `?chave=admin123`: Desbloqueia e autentica o Administrador automaticamente sem exigir redigitação de senha.
    - `?chave=master123`: Desbloqueia e autentica o Dono do App (Super Admin) diretamente.
    - `?chave=barber123`: Desbloqueia e autentica o Barbeiro instantaneamente.
  - **Links de Atendimento Direto do Barbeiro:** `/b/:slug` ou `?b=slug` ou `?barbeiro=slug` — abre a loja pública com o barbeiro já pré-selecionado para agendamento.
- **Central de Links & Divulgação (`ShareLinksCard`):**
  - Adicionado nos módulos de gestão (`AdminModule`, `SuperAdminModule`, `BarberModule`) com cópia em 1 clique:
    1. *Link da Loja para Clientes*: `window.location.origin + window.location.pathname` (para Instagram, Bio, WhatsApp e Google).
    2. *Link Exclusivo do Lojista*: com `?admin=1` para o lojista salvar nos favoritos do celular ou navegador.
    3. *Link Seguro com Chave*: com `?chave=admin123` para acesso rápido.
    4. *Link da Agenda do Barbeiro*: com `?barbeiro=1`.
- **Retorno Seguro e Limpeza de URL:**
  - Botão "Voltar à Loja" ou "Sair" nos painéis gerenciais limpa automaticamente os parâmetros da URL (`window.history.pushState`) e devolve o usuário à vitrine limpa de clientes.
  - Se o modal de senha for cancelado, a URL é limpa automaticamente via `window.history.replaceState`.

---

## 6. Diretrizes para Próximas Alterações
- Toda alteração deve manter a responsividade fluida em telas mobile, tablet e desktop.
- Nunca reintroduzir molduras de celular ou containers falsos.
- Nunca expor chaves de API sensíveis no frontend.
- Antes de qualquer alteração, leia este documento para certificar-se da estrutura vigente.
