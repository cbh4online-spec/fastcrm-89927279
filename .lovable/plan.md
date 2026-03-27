

# Refactoring da Navegacao Principal do FastCRM

## Contexto e Problema

A navegacao atual esta fragmentada em **4 ficheiros de configuracao independentes** que nao partilham uma fonte de verdade:

- `nav.adaptive.ts` -- sidebar atual (core + role extras)
- `nav.v2.ts` -- ~460 linhas com grupos tecnicos (groupCrm, groupTools, groupSecurity...)
- `moduleNavRegistry.ts` -- modulos dinamicos do marketplace
- `routes.legacy.ts` -- rotas legadas para o GlobalSearch

Isto gera duplicacao massiva, links orfaos, e uma UX confusa onde o utilizador ve categorias tecnicas ("Tools", "Modules") em vez de areas de negocio.

---

## Nova Arquitetura

```text
src/config/
  routeManifest.ts    ← FONTE UNICA DE VERDADE (novo)
  
src/components/layout/
  AdaptiveSidebar.tsx  ← consome routeManifest (reescrito)
  GlobalSearch.tsx     ← consome routeManifest (migrado)

src/config/
  nav.v2.ts            ← ELIMINADO (absorvido pelo manifest)
  nav.adaptive.ts      ← ELIMINADO (absorvido pelo manifest)
  moduleNavRegistry.ts ← ELIMINADO (absorvido pelo manifest)
  routes.legacy.ts     ← ELIMINADO (absorvido pelo manifest)
```

---

## 1. Route Manifest Central (`routeManifest.ts`)

Ficheiro unico que mapeia **todas** as rotas navegaveis do backoffice. Cada entrada contem:

```typescript
interface RouteEntry {
  key: string;               // identificador unico
  label: string;             // nome amigavel PT
  href: string;              // rota real existente
  icon: LucideIcon;
  group: NavGroup;           // 'inicio' | 'comercial' | 'comunicacao' | ...
  parent?: string;           // key do item-pai (para sub-menus)
  moduleSlug?: string;       // modulo marketplace necessario
  requiredRole?: string[];   // roles com acesso
  requiredPlan?: string[];   // planos com acesso
  menuKey?: string;          // key de menu_permissions
  badgeKey?: string;
  status: 'active' | 'hidden' | 'disabled';
  fallbackRoute?: string;
  visibleInSidebar: boolean;
  visibleInSearch: boolean;
  isBeta?: boolean;
  isPro?: boolean;
}
```

**9 Grupos de negocio** (cada um e uma seccao colapsavel na sidebar):

| Grupo | Items principais | Rotas reais |
|---|---|---|
| **Inicio** | Dashboard, Daily Brief, Revenue Control, Alertas | `/dashboard`, `/dashboard/daily-brief`, `/dashboard/revenue-flight-control`, `/dashboard/alerts` |
| **Comercial** | Leads, Contactos, Empresas, Pipeline, Renovacoes, Lifecycle, Sequencias, FastMatch | `/dashboard/leads`, `/dashboard/contacts`, `/dashboard/companies`, `/dashboard/opportunities`, `/dashboard/renewals`, `/dashboard/lifecycle`, `/dashboard/sequences`, `/dashboard/fastmatch` |
| **Comunicacao** | Inbox, Email, Templates, Calendario, Grupos, Telegram | `/dashboard/inbox`, `/dashboard/email-campaigns`, `/dashboard/communication/templates`, `/dashboard/scheduling`, `/dashboard/groups`, `/dashboard/telegram` |
| **Marketing** | Campanhas, Funis, Formularios, SEO, Bio OS, Prospecao, Instagram Looter | `/dashboard/email-campaigns`, `/dashboard/funnels`, `/dashboard/form-studio`, `/dashboard/seo`, `/dashboard/bio`, `/dashboard/prospecting`, `/dashboard/instagram-looter` |
| **Vendas** | Propostas, Faturas, Produtos, Notas Encomenda, Bundles, Performance | `/dashboard/proposals`, `/dashboard/invoices`, `/dashboard/products`, `/dashboard/order-notes`, `/dashboard/bundles`, `/dashboard/performance` |
| **Comercio** | Loja Online (sub-grupo), C2C (sub-grupo), B2B Portal (sub-grupo) | `/dashboard/store-*`, `/dashboard/c2c/*`, `/dashboard/b2b-*`, `/dashboard/order-*` |
| **Operacoes** | Tarefas, Eventos, Procurement (sub-grupo completo), Projetos | `/dashboard/tasks`, `/dashboard/events`, `/dashboard/procurement/*` |
| **Inteligencia** | Command Center, CEO Copilot, Knowledge Base, AI Assistants, AI Employees, AI Engine, Suggestions, Context OS, Impact Map, Kernel | `/command-center`, `/dashboard/ceo-copilot`, `/dashboard/knowledge`, `/dashboard/ai-assistants`, `/dashboard/ai-employees`, `/dashboard/ai-engine`, `/dashboard/ai-suggestions`, `/dashboard/context-os`, `/dashboard/impact-map`, `/dashboard/kernel` |
| **Administracao** | Equipa, Permissoes, Faturacao, Integracoes, Settings, Super Admin, Marketplace, System Health | `/settings`, `/settings/*`, `/super-admin`, `/dashboard/marketplace`, `/dashboard/system/*` |

Total: ~120+ rotas mapeadas a partir dos route files existentes, sem inventar nenhuma rota nova.

---

## 2. Nova Sidebar

A `AdaptiveSidebar.tsx` sera reescrita para:

1. **Consumir o routeManifest** em vez dos 3 ficheiros atuais
2. **Filtrar items** por: modulos instalados (`useWorkspaceModules`), role do utilizador (`useMenuPermissions`), plano de subscricao
3. **Esconder grupos vazios** automaticamente quando todos os items de um grupo estao filtrados
4. **Manter** o brand header, preview mode, collapse/expand, touch gestures, badges
5. **Adicionar** badges Pro/Beta e tooltips em items disabled

Hierarquia visual:
```text
┌────────────────────────────┐
│ Logo + Workspace + User    │
├────────────────────────────┤
│ 🔍 Pesquisar... (⌘K)     │
├────────────────────────────┤
│ INICIO                     │
│   Dashboard                │
│   Daily Brief              │
│   Revenue Control          │
│   Alertas                  │
├────────────────────────────┤
│ ▶ COMERCIAL               │
│ ▶ COMUNICACAO             │
│ ▶ MARKETING               │
│ ▶ VENDAS                  │
│ ▶ COMERCIO                │
│ ▶ OPERACOES               │
│ ▶ INTELIGENCIA            │
├────────────────────────────┤
│ ▶ ADMINISTRACAO           │
│ ◀ Recolher                │
└────────────────────────────┘
```

Cada grupo colapsavel abre para mostrar items. Items com `moduleSlug` que nao esteja instalado ficam **ocultos** (nao disabled). Items com `requiredPlan` acima do plano atual ficam **disabled com tooltip**.

---

## 3. Navigation Guard e Zero Dead Links

- Antes de renderizar um link, validar que a rota existe no manifest com `status: 'active'`
- Items sem modulo ativo: **escondidos**
- Items sem permissao: **escondidos**
- Items sem plano: **disabled + tooltip "Disponivel no plano Growth"**
- Fallback: rota `/dashboard` para qualquer 404 dentro de `/dashboard/*`
- **Redirect map**: criar `Navigate` entries para URLs que mudaram (ex: se algum item muda de path)

---

## 4. Migracao do GlobalSearch

`GlobalSearch.tsx` importa atualmente `NAV_V2_ITEMS` e `LEGACY_ROUTES`. Sera migrado para importar o routeManifest filtrado por `visibleInSearch: true`, eliminando as 2 fontes antigas.

---

## 5. Intocavel

- **Rotas reais** nos ficheiros `src/routes/*.tsx` -- nenhuma alteracao
- **Client portal** (`/client-portal/*`) -- navegacao propria, completamente separada
- **Public routes** -- sem impacto
- **ModuleGuard** -- continua a funcionar para paginas que requerem modulo

---

## 6. Smoke Tests

Criar `src/test/navigation.test.ts`:
- Validar que todos os items do manifest com `visibleInSidebar: true` apontam para rotas definidas nos route files
- Validar que nao existem labels duplicadas no mesmo grupo
- Validar que grupos sem items nao sao renderizados
- Validar separacao `/client-portal` vs `/dashboard`

---

## 7. Ficheiros a Alterar

| Ficheiro | Acao |
|---|---|
| `src/config/routeManifest.ts` | **CRIAR** -- fonte unica de verdade |
| `src/components/layout/AdaptiveSidebar.tsx` | **REESCREVER** -- consumir manifest |
| `src/components/layout/GlobalSearch.tsx` | **MIGRAR** -- usar manifest |
| `src/config/nav.v2.ts` | **DEPRECAR** -- manter temporariamente, remover imports |
| `src/config/nav.adaptive.ts` | **DEPRECAR** -- absorvido pelo manifest |
| `src/config/moduleNavRegistry.ts` | **DEPRECAR** -- absorvido pelo manifest |
| `src/config/routes.legacy.ts` | **DEPRECAR** -- absorvido pelo manifest |
| `src/test/navigation.test.ts` | **CRIAR** -- smoke tests |

---

## 8. Faseamento

**Fase 1** -- Route Manifest + Nova Sidebar (impacto visual imediato)
- Criar `routeManifest.ts` com todas as ~120 rotas
- Reescrever `AdaptiveSidebar.tsx` para consumir o manifest
- Integrar module-aware + role-based filtering

**Fase 2** -- Consolidacao e Guards
- Migrar GlobalSearch para manifest
- Implementar navigation guard (disabled + tooltip)
- Redirect map
- Eliminar ficheiros antigos

**Fase 3** -- Testes e Auditoria
- Smoke tests
- Relatorio de rotas orfas
- Validacao final

Recomendo aprovar para executar por fases, comecando pela Fase 1.

