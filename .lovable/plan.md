

# React.memo nos Componentes de Lista Repetidos

## Componentes a memoizar

| Componente | Ficheiro | Já tem memo? | Renderizado em loop? |
|------------|----------|-------------|---------------------|
| `OpportunityCard` | `opportunities/OpportunityCard.tsx` | Não | Sim (Kanban column .map) |
| `OpportunityKanbanColumn` | `opportunities/OpportunityKanbanColumn.tsx` | Não | Sim (stages .map) |
| `KPICard` (store) | `store/analytics/KPICard.tsx` | Não | Sim (cards .map) |
| `KPICard` (design-system) | `design-system/KPICard.tsx` | Não | Sim (cards .map) |
| `KPICard` (kpis) | `kpis/KPICard.tsx` | Não | Sim (cards .map) |
| `KPICardWithChart` | `dashboard/KPICardWithChart.tsx` | Não | Sim |
| `TicketKanban` card | `tickets/TicketKanban.tsx` | Não | Sim (inline JSX em .map) |
| Activity timeline item | `opportunities/detail/OpportunityActivityTimeline.tsx` | Não | Sim (inline JSX em .map) |
| `SmartCompanyRow` | `companies/SmartCompanyRow.tsx` | **Sim** (já adicionado) | — |

## Plano de implementação

### 1. Wrap directo com `React.memo` (componentes já exportados como funções)

Padrão: converter `export function X(...)` para `export const X = memo(function X(...))` com import de `memo` do React.

**Ficheiros:**
- `src/components/opportunities/OpportunityCard.tsx`
- `src/components/opportunities/OpportunityKanbanColumn.tsx`
- `src/components/store/analytics/KPICard.tsx`
- `src/components/design-system/KPICard.tsx`
- `src/components/kpis/KPICard.tsx`
- `src/components/dashboard/KPICardWithChart.tsx`

### 2. Extrair componentes inline para memo (JSX dentro de .map)

**TicketKanban** (`tickets/TicketKanban.tsx`):
- Extrair o `<Card>` dentro do `.map()` para um componente `TicketKanbanCard` com `React.memo`
- Props: `ticket`, `onTicketClick`

**OpportunityActivityTimeline** (`opportunities/detail/OpportunityActivityTimeline.tsx`):
- Extrair o `<div>` da activity dentro do `.map()` para um componente `ActivityTimelineItem` com `React.memo`
- Props: `activity`, `getInitials`

### Ficheiros alterados (8 ficheiros)

| Ficheiro | Alteração |
|----------|-----------|
| `OpportunityCard.tsx` | Wrap com memo |
| `OpportunityKanbanColumn.tsx` | Wrap com memo |
| `store/analytics/KPICard.tsx` | Wrap com memo |
| `design-system/KPICard.tsx` | Wrap com memo |
| `kpis/KPICard.tsx` | Wrap com memo |
| `dashboard/KPICardWithChart.tsx` | Wrap com memo |
| `tickets/TicketKanban.tsx` | Extrair `TicketKanbanCard` com memo |
| `OpportunityActivityTimeline.tsx` | Extrair `ActivityTimelineItem` com memo |

### Nota
- `OpportunityCard` usa `motion.div` (framer-motion) — `memo` funciona normalmente à volta do componente inteiro, o framer-motion anima via style não via re-render.
- `SmartCompanyRow` já tem memo aplicado na sessão anterior — sem alteração necessária.

