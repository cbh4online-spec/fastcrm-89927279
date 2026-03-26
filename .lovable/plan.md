

# PASSO 2 — Cleanup Final da Arquitetura de Rotas

## Estado Atual Verificado

| Ficheiro | Existe? | Estado |
|---|---|---|
| `src/App.v2.tsx` | **Não** | Já foi apagado anteriormente |
| `src/routes/CRMRoutes.v2.tsx` | **Sim** | Ativo, usado por `App.tsx` |
| `src/routes/CRMRoutes.tsx` (sem .v2) | **Não** | Nunca existiu |
| `src/routes/StoreRoutes.tsx` | **Sim** | Ativo |
| `src/routes/ClientPortalRoutes.tsx` | **Sim** | Ativo |
| `src/routes/StoreClientRoutes.tsx` | **Sim** | Ativo (exporta `StoreAdminRoutes`, `B2BAdminRoutes`) |
| `src/routes/crm/*.tsx` (4 ficheiros) | **Sim** | Todos ativos |

- Nenhum import morto ou duplicado encontrado
- Nenhuma rota duplicada ou conflituante
- Nenhum ficheiro legacy adicional a remover

## Ação Necessária

Apenas **1 normalização**:

### Renomear `CRMRoutes.v2.tsx` → `CRMRoutes.tsx`

1. **Criar** `src/routes/CRMRoutes.tsx` com o conteúdo exato de `CRMRoutes.v2.tsx` (sem alterações)
2. **Atualizar** `src/App.tsx` linha 18: `import CRMRoutesV2 from "@/routes/CRMRoutes.v2"` → `import CRMRoutesV2 from "@/routes/CRMRoutes"`
3. **Apagar** `src/routes/CRMRoutes.v2.tsx`

O nome do export `CRMRoutesV2` mantém-se inalterado — apenas o nome do ficheiro é normalizado.

## Ficheiros Não Alterados

- `StoreClientRoutes.tsx` — mantém-se (ainda exporta rotas usadas pelo CRM)
- Todos os `src/routes/crm/*.tsx` — intactos
- Todos os outros route modules — intactos
- Nenhum URL muda

## Validação de Rotas

Todas as rotas listadas continuam a resolver após esta mudança porque nenhuma lógica de routing é alterada — apenas o nome do ficheiro de import:

- `/login`, `/dashboard`, `/dashboard/leads`, `/dashboard/opportunities`, `/dashboard/inbox` — via `DashboardCoreRoutes`
- `/dashboard/proposals`, `/dashboard/products` — via `SalesCRMRoutes`
- `/dashboard/marketplace` — via `RevenueCommerceRoutes`
- `/dashboard/procurement` — via `ProcurementRoutes`
- `/dashboard/security` — via `SecurityRoutes`
- `/dashboard/student-journey` — via `StudentJourneyRoutes`
- `/client/login` — via `ClientPortalRoutes`
- `/store/:workspaceSlug` — via `StoreRoutes`
- `/club/fastclub` — via `App.tsx` (public route)
- `/fastcrm` — via `DashboardCoreRoutes`
- `/marketplace/:workspaceSlug` — via `App.tsx` (public route)
- `/c2c/:workspaceSlug` — redirect em `App.tsx`
- `/p/:workspaceSlug/:pageSlug` — via `PublicSeoRoutes`
- `/:slug` — via `PublicSeoRoutes`

