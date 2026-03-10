# FastCRM — Plataforma CRM Inteligente

> CRM modular e multi-idioma com IA integrada, pipeline visual, automações e módulos de vendas, compras, performance e comunicação.

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | Lovable Cloud — Edge Functions, Auth, Storage |
| State | TanStack React Query |
| i18n | i18next (PT, EN, ES, FR) |
| Charts | Recharts |

## Estrutura do Projecto

```
src/
├── components/        # Componentes React organizados por domínio
│   ├── layout/        # DashboardLayout, Sidebar, TopBar
│   ├── common/        # PageHeader, Toolbar, FilterSidebar, ColumnSelector
│   ├── design-system/ # Tokens, KPICard, EmptyState, StatusBadge
│   ├── crm/           # Leads, Contactos, Empresas (unified)
│   ├── contacts/      # AttioContactsTable, ENI, Lifecycle
│   ├── companies/     # SmartCompaniesTable
│   ├── leads/         # SmartLeadsTable, Duplicate Review
│   ├── invoices/      # CreateInvoiceDialog, Settings, Recurring
│   ├── command-center/ # Command Center cards
│   └── ...            # Outros módulos (procurement, performance, etc.)
├── hooks/             # Custom hooks (useSmartLeads, useInvoices, etc.)
├── pages/             # Páginas/rotas
├── i18n/              # Traduções (PT, EN, ES, FR)
│   └── locales/       # Ficheiros JSON por idioma e namespace
├── contexts/          # Auth, Workspace, Subscription
├── config/            # nav.v2.ts, extensionRegistry
└── integrations/      # Client auto-gerado
```

## Módulos Principais

### CRM (Leads, Contactos, Empresas)
- Tabelas inteligentes com colunas AI (temperatura, score, tipo, próxima acção)
- Análise IA individual e em massa
- Gestão de duplicados unificada (detecção + fusão)
- Ciclo de vida com timeline de transições
- Acções rápidas (mensagem, oportunidade, automação)
- Import/Export CSV

### Pipeline & Oportunidades
- Kanban visual com drag-and-drop
- Previsão de receita (Revenue Flight Control)

### Faturas
- CRUD completo com estados (Rascunho → Enviada → Paga → Vencida)
- Acções em massa (enviar, marcar como paga, exportar)
- Faturas recorrentes, fiscalidade, SAF-T
- Filtros inteligentes (valor, período, vencimento próximo)

### Performance / Gamificação
- Leaderboard semanal com pontuação ponderada
- Desafios, metas e reconhecimentos
- TV Mode para ecrãs de escritório
- KPIs: Receita, Pipeline, Reuniões, Performers Ativos

### Compras (Procurement)
- Fluxo: Requisição → Ordem de Compra → Recepção → Fatura
- Gestão de fornecedores e catálogo
- RFQs e importação de preços
- Dashboard com estados vazios orientados

### Comunicação
- Inbox unificada (email, WhatsApp)
- Mural interno e Templates de mensagens
- Agentes IA conversacionais

### Command Center
- Dashboard executivo com KPIs, decisões Kernel, pipeline risk
- AI Question Box com slash commands
- Kernel Live Feed e Brief Executivo

## Internacionalização (i18n)

Suporta **4 idiomas**: Português (PT), English (EN), Español (ES), Français (FR).

### Namespaces
`common`, `nav`, `dashboard`, `crm`, `settings`, `landing`, `inbox`, `automations`, `intelligence`, `invoices`, `products`, `auth`, `reports`, `meetings`, `ask`, `procurement`, `performance`

### Convenções
- Usar sempre `useTranslation("namespace")` nos componentes
- Chaves em camelCase: `statusDraft`, `colClient`, `sortNewest`
- Labels de UI nunca hardcoded — sempre via `t()`
- Ficheiros em `src/i18n/locales/{pt,en,es,fr}/{namespace}.json`

## Navegação (Sidebar)

Hierarquia baseada em workflow:

1. **Core** (sempre visível): Início, Command Center, Brief Executivo, AI CEO Copilot, Context OS, Impact Map, Revenue Flight Control
2. **Grupos colapsáveis**: Relatórios, CRM, Comunicação, Performance, Vendas, Marketing, Compras, B2B, Loja Online, Marketplace C2C, FastClub, Ferramentas
3. **Funcionalidades**: Pesquisa rápida, favoritos com pin (⭐), badges de contagem (leads novas, faturas vencidas, inbox não lido)

### Rotas
- Prefixo `/dashboard/` em todas as rotas de módulos
- Uma única entrada por funcionalidade (sem aliases duplicados)
- Todas as páginas usam `<DashboardLayout>` para manter a sidebar visível

## Design System

- Usar tokens semânticos do `index.css` e `tailwind.config.ts`
- Nunca usar cores hardcoded — sempre via CSS variables HSL
- Componentes reutilizáveis: `PageHeader`, `Toolbar`, `FilterSidebar`, `KPICard`, `EmptyState`
- Badges de estado consistentes por módulo

## Desenvolvimento Local

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

## Deployment

- **Frontend**: Publish → Update no editor Lovable
- **Backend** (Edge Functions, migrações): Deploy automático

## Contribuição

1. Seguir as convenções de i18n (nunca strings hardcoded)
2. Usar componentes do design system
3. Manter RLS policies em todas as tabelas
4. Testar em todos os idiomas suportados
