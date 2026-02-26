

# Tooltip com Detalhes do Evento no Calendário

## Abordagem

Enriquecer o `metadata` dos eventos comunitários com `location`, `price`, `capacity` e `currency` no hook. Depois, adicionar um `Tooltip` (Radix) a cada bloco de evento nas 3 vistas (Month, Week, Day) mostrando esses dados. Para RSVPs, adicionar contagem ao metadata via query secundária no hook.

## Alterações

### 1. Editar `src/hooks/useCommunityEventsForCalendar.ts`

- No mapeamento de eventos, adicionar ao `metadata`: `_location`, `_price`, `_currency`, `_capacity`
- Após buscar eventos, fazer query a `event_rsvps` agrupada por `event_id` para contar RSVPs (`confirmed`, `invited`, total) e guardar em `metadata._rsvpCounts`

### 2. Criar componente auxiliar `src/components/calendars/EventTooltipContent.tsx`

Componente simples que recebe `event.metadata` e renderiza:
- 📍 Local (se existir)
- 💰 Preço (se > 0, com currency)
- 👥 RSVPs: X confirmados / Y convidados

### 3. Editar `src/components/calendars/CalendarView.tsx`

- Importar `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` do Radix
- Importar `EventTooltipContent`
- Envolver cada bloco de evento (nas 3 vistas: MonthView, WeekView, DayView) num `Tooltip` com o conteúdo detalhado
- Manter o `onClick` existente no trigger

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useCommunityEventsForCalendar.ts` | Adicionar location/price/rsvps ao metadata |
| `src/components/calendars/EventTooltipContent.tsx` | Novo componente de tooltip |
| `src/components/calendars/CalendarView.tsx` | Envolver eventos em Tooltip |

