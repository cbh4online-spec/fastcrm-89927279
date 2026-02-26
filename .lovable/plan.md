

# Integrar Eventos (community_events) na Vista de Calendário

## Contexto

Existem dois sistemas separados: `calendar_events` (calendários internos) e `community_events` (eventos/convites). Os eventos de `community_events` não aparecem na vista de calendário. A integração vai converter `EventRecord` em `CalendarEvent` e mesclá-los na vista.

## Alterações

### 1. Novo hook `src/hooks/useCommunityEventsForCalendar.ts`

Busca `community_events` do workspace actual dentro do dateRange fornecido. Converte cada `EventRecord` para o formato `CalendarEvent` com:
- `calendar_id` fixo como `"community-events"` (pseudo-calendário virtual)
- `start_time` = `starts_at`, `end_time` = `ends_at` (ou starts_at + 1h se null)
- `status` mapeado: published→confirmed, draft→tentative, cancelled→cancelled
- `calendar` virtual com cor distinta (ex: `#F59E0B` amarelo) e nome "Eventos & Convites"

### 2. Editar `CalendarsPage.tsx`

- Importar `useCommunityEventsForCalendar`
- Chamar o hook com o mesmo `dateRange`
- Adicionar um pseudo-calendário "Eventos & Convites" à lista de calendários e ao sidebar
- Toggle de visibilidade independente na sidebar
- Mesclar os eventos convertidos com os `events` do calendário normal antes de passar ao `CalendarGlobalView`
- Click em evento comunitário → navegar para `/dashboard/events/:id` em vez de abrir o modal de edição

### 3. Editar `CalendarSidebar.tsx`

- Aceitar prop opcional `extraCalendars` para calendários virtuais (como o de eventos)
- Renderizar na sidebar com checkbox e cor própria, separados por divisor "Outros"

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useCommunityEventsForCalendar.ts` | Criar hook que converte community_events → CalendarEvent[] |
| `src/pages/CalendarsPage.tsx` | Mesclar eventos comunitários + toggle de visibilidade |
| `src/components/calendars/CalendarSidebar.tsx` | Renderizar calendário virtual "Eventos & Convites" |

