

# Widget de Próximos Eventos no Dashboard

## Alterações

### 1. Novo hook `src/hooks/useUpcomingEventsWithRsvps.ts`

Query que busca os próximos 5 `community_events` (futuros, ordenados por `starts_at`) do workspace actual. Para cada evento, faz uma segunda query a `event_rsvps` agrupada por `status` para obter contagem de pendentes (`invited`). Retorna array com evento + `rsvpCounts`.

### 2. Novo componente `src/components/dashboard/UpcomingEventsWidget.tsx`

Widget no estilo do `UpcomingBirthdaysWidget`:
- Ícone `CalendarDays` no header + título "Próximos Eventos"
- Lista dos próximos 5 eventos com: título, data formatada, badge com contagem de RSVPs pendentes (status `invited`)
- Click navega para `/dashboard/events/{id}`
- Loading skeleton + empty state
- Badge amber para pendentes > 0

### 3. Editar `src/pages/Dashboard.tsx`

Importar e adicionar `UpcomingEventsWidget` na coluna lateral (col-span-4), acima do `UpcomingBirthdaysWidget`.

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useUpcomingEventsWithRsvps.ts` | Hook que busca eventos + contagem RSVPs |
| `src/components/dashboard/UpcomingEventsWidget.tsx` | Widget visual |
| `src/pages/Dashboard.tsx` | Adicionar widget ao layout |

