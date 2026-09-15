# Documentação Oficial do Projeto - Líder Barbers

> **Aviso Importante para a IA e Desenvolvedores:**
> Este arquivo registra a arquitetura real, o estado atual das funcionalidades, as regras de segurança e o histórico de alterações do projeto **Líder Barbers**.
> **Você (a IA) DEVE ler este arquivo antes de executar qualquer alteração subsequente** solicitada pelo usuário para partir do estado real do projeto e nunca de suposições. Ao término de cada alteração, atualize este arquivo com as implementações realizadas.

---

## 1. Identidade e Propósito do Projeto
- **Nome da Marca:** Líder Barbers
- **Slogan:** Estilo • Respeito • Liderança
- **Cores Primárias:** Ouro Envelhecido/Dourado (`#D4AF37`, `#B38F2E`, `#997A23`) e Preto Grafite (`#121212`, `#141417`, `#0D0D0F`).
- **Público e Casos de Uso:**
  1. **Clientes:** Agendamento online de cortes e barba em tempo real, seleção de profissional, acompanhamento de agendamentos, cancelamentos com regra de antecedência e cancelamento/reagendamento.
  2. **Barbeiros:** Gestão de agenda diária/semanal, horários de atendimento, bloqueios, acompanhamento de status de clientes.
  3. **Administradores:** Gestão de equipe de barbeiros, catálogo de serviços, relatórios operacionais e métricas financeiras.

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

## 3. Segurança e Separação de Acessos (RBAC & Prevenção de Vazamento)
### Diagnóstico do Problema Solucionado:
Anteriormente, a troca de perfil era feita por um seletor livre no topo do aplicativo, permitindo que qualquer cliente acessasse a visão do barbeiro ou o painel administrativo geral, visualizando receitas financeiras e dados de outros clientes.

### Implementação de Segurança:
1. **Gate de Autenticação / Senha (`AuthModal.tsx`):**
   - Acesso padrão: **Cliente** (aberto para qualquer usuário).
   - O acesso às abas de **Barbeiro** ou **Administrador** exige desbloqueio por senha/PIN de segurança.
   - Credenciais padrão para ambiente de gestão:
     - **Administrador:** `admin123` ou `1234`
     - **Barbeiro:** `barber123` ou `1234`
   - Estado de autenticação mantido no ciclo de vida da sessão (`unlockedRoles`).
2. **Indicadores Visuais de Bloqueio:**
   - Ícones de cadeado (`Lock`) nos botões de Barbeiro e Admin no `Header.tsx` para sinalizar ao cliente que aquelas áreas são restritas da gerência.
3. **Regras de Isolamento de Dados:**
   - A visão do cliente exibe estritamente os agendamentos pertencentes ao seu ID (`clientAppointments`).
   - A visão do barbeiro filtra estritamente os clientes que possuem agendamento com aquele barbeiro.
   - O painel administrativo agrega todas as métricas gerais com acesso protegido.

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

### Versão 1.2 (Sessão Atual - Segurança, PWA e Documentação)
- **Criação da Documentação (`DOCUMENTACAO-PROJETO.md`):** Estabelecido como guia permanente do projeto a ser lido antes de qualquer intervenção.
- **Separação de Perfis & Segurança Anti-Vazamento:**
  - Criado componente `AuthModal.tsx` para autenticar tentativas de acesso às áreas de Barbeiro e Administrador.
  - Implementado bloqueio com PIN nos seletores do cabeçalho.
  - Isolamento estrito de dados para impedir que clientes vejam faturamento ou dados de terceiros.
- **Instalação PWA ("Baixar Aplicativo"):**
  - Criado componente `InstallPwaModal.tsx` para guiar a instalação no Android, PC e iOS.
  - Adicionado botão "Baixar App" de destaque no `Header.tsx`.
  - Gerados ícones binários PNG válidos (192x192 e 512x512) para conformidade total com os critérios de PWA.
  - Atualizado `sw.js` com o escopo do cache `lider-barbers-v1`.

### Versão 1.1 (Sessão Anterior - Responsividade & Rebranding)
- Remoção total da moldura de celular (simulação mobile) no desktop.
- Layout 100% fluido e responsivo para monitores grandes, tablets e smartphones reais.
- Rebranding completo para **Líder Barbers** com tipografia Cinzel e Montserrat.
- Integração de notificações Web Push reais e sincronização de dados via Firebase Firestore.

---

## 6. Diretrizes para Próximas Alterações
- Toda alteração deve manter a responsividade fluida em telas mobile, tablet e desktop.
- Nunca reintroduzir molduras de celular ou containers falsos.
- Nunca expor chaves de API sensíveis no frontend.
- Antes de qualquer alteração, leia este documento para certificar-se da estrutura vigente.
