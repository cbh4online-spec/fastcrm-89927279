

# Auditoria de Performance — FastCRM

## Resumo Executivo

O projecto tem **~200+ páginas**, rotas bem organizadas com lazy loading, mas apresenta lacunas significativas em virtualização, selectividade de queries, memoização de componentes e controlo de bundle. Abaixo o diagnóstico por pilar.

---

## 1. LAZY LOADING — Estado: BOM (com ressalvas)

**Positivo:** Todas as ~30 route files usam `lazy(() => import(...))` consistentemente. O `Suspense` wrapper está no `CRMRoutesV2`.

**Problemas identificados:**
- Componentes pesados importados estaticamente dentro de páginas (FullCalendar, Nivo charts, TipTap editor, @react-pdf/renderer, exceljs) — não são lazy-loaded no ponto de uso
- `@faker-js/faker` está nas **dependencies** (não devDependencies) — potencialmente incluído no bundle de produção (~2MB)

---

## 2. QUERIES SEM SELECT EXPLÍCITO — Estado: CRÍTICO

**365 ficheiros** usam `.select("*")` — isto significa que quase todas as queries do projecto puxam todas as colunas.

**Impacto:** Transferência de dados desnecessários, especialmente em tabelas com campos JSONB, text longo ou muitas colunas.

**Piores casos (tabelas grandes com select \*):**
- `companies`, `contacts`, `leads` — tabelas core com dezenas de colunas
- `crm_activities` — alto volume
- `opportunities` — usado em Kanban + listas
- `proposals`, `invoices` — com campos de texto longo

**Recomendação:** Priorizar as 10-15 queries de listagem mais usadas (contacts, companies, opportunities, leads, activities) e substituir `.select("*")` por colunas explícitas.

---

## 3. VIRTUALIZAÇÃO — Estado: CRÍTICO

**`@tanstack/react-virtual` está instalado (v3.13.23) mas tem ZERO utilizações no código.**

**Listas não virtualizadas identificadas:**
- `SmartContactsTable` — pode ter centenas/milhares de registos
- `SmartCompaniesTable` — idem
- `OpportunityTableView` — lista de oportunidades
- `ProposalsList` — paginação client-side, mas sem virtualização
- Kanban columns (`OpportunityKanbanColumn`) — cards renderizados todos
- Activity logs, entity notes, ticket lists, lead lists

**Impacto:** Com 200+ registos, o DOM fica pesado, scrolling lento, re-renders caros.

---

## 4. BUNDLE SIZE — Estado: RISCO ELEVADO

**Dependências pesadas (estimativas gzip):**
| Lib | Tamanho estimado | Lazy? |
|-----|-----------------|-------|
| `@faker-js/faker` | ~500KB-2MB | NÃO (nem devia estar em prod) |
| `@nivo/*` (7 packages) | ~200KB+ | Provavelmente não |
| `@fullcalendar/*` (5 packages) | ~150KB+ | Provavelmente não |
| `@tiptap/*` (13 extensions) | ~100KB+ | Provavelmente não |
| `@react-pdf/renderer` | ~200KB+ | Provavelmente não |
| `@sentry/react` | ~50KB | OK (init condicional) |
| `exceljs` | ~300KB | Provavelmente não |
| `@react-google-maps/api` | ~50KB | Provavelmente não |

**`import * as LucideIcons`** encontrado em 3 ficheiros — importa TODOS os ícones (~200KB) em vez de ícones individuais.

---

## 5. MEMOIZAÇÃO DE COMPONENTES — Estado: FRACO

Apenas **5 componentes** em todo o projecto usam `React.memo` (todos em flow/diagram nodes). Nenhum componente de lista (cards, rows, table cells) está memoizado.

**Candidatos prioritários a memo:**
- Cards de Kanban (OpportunityKanbanColumn items)
- Rows de tabela (contacts, companies, leads, opportunities)
- Cards de dashboard (KPI widgets)
- Items de timeline/activity

---

## 6. QUERY CACHING — Estado: RAZOÁVEL

- **112 ficheiros** definem `staleTime` — boa cobertura
- Apenas **6 ficheiros** usam `refetchOnWindowFocus: false` — queries pesadas de analytics/dashboards deviam ter isto
- Muitas queries operacionais sem `staleTime` definido (default 0 = sempre stale)

---

## Plano de Remediação (por prioridade)

### P0 — Impacto imediato
1. **Mover `@faker-js/faker` para devDependencies** — elimina potencialmente ~500KB+ do bundle
2. **Corrigir `import * as LucideIcons`** nos 3 ficheiros — elimina ~200KB
3. **Adicionar virtualização** às tabelas core (contacts, companies, opportunities) — `@tanstack/react-virtual` já está instalado

### P1 — Alto impacto
4. **Dynamic import de libs pesadas** — exceljs, @react-pdf/renderer, @nivo/*, @fullcalendar/*, @tiptap/* — carregar apenas quando o utilizador acede à funcionalidade
5. **Substituir `.select("*")` por colunas explícitas** nas 15 queries mais frequentes (contacts list, companies list, opportunities, leads, activities)
6. **Adicionar `React.memo`** a componentes de lista repetidos (kanban cards, table rows, dashboard cards)

### P2 — Optimização contínua
7. **Adicionar `refetchOnWindowFocus: false`** a todas as queries de analytics/dashboards/KPIs
8. **Definir `staleTime` default** no QueryClient (ex: 30s) para evitar queries sem cache
9. **Auditar barrel files** em pastas grandes e eliminar re-exports desnecessários
10. **Correr `npx vite-bundle-visualizer`** para confirmar tamanhos reais e identificar chunks inesperados

### Ficheiros-chave a alterar
| Acção | Ficheiros |
|-------|-----------|
| faker → devDeps | `package.json` |
| LucideIcons wildcard | `PublicBioPage.tsx`, `ProductCard.tsx`, `POSProductSelector.tsx` |
| Virtualização | `SmartContactsTable.tsx`, `SmartCompaniesTable.tsx`, `OpportunityTableView.tsx` |
| select("*") → explícito | ~15 hooks prioritários (useActivities, useOpportunitiesEnhanced, useCompanyDuplicates, etc.) |
| React.memo | Kanban cards, table row components, KPI cards |

---

## Métricas de Sucesso
- Bundle principal < 250KB gzip
- LCP < 2.5s no dashboard principal
- Listas de 500+ registos com scroll fluido (60fps)
- Queries de listagem transferem < 50% dos bytes actuais

