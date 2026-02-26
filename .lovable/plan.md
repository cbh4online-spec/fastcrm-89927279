

# Cores por Categoria de Evento na Vista de Calendário

## Abordagem

Actualmente todos os eventos comunitários usam a mesma cor (`#F59E0B`) porque partilham um único pseudo-calendário virtual. A cor é resolvida via `getCalendarColor(event.calendar_id)` que procura na lista de calendários.

A solução mais simples: guardar a cor da categoria no `metadata` de cada evento mapeado e alterar `getCalendarColor` para dar prioridade a essa cor quando presente.

## Alterações

### 1. Editar `src/hooks/useCommunityEventsForCalendar.ts`

Adicionar mapa de cores por categoria:
```
networking → #3B82F6 (azul)
jantar → #EF4444 (vermelho)
workshop → #8B5CF6 (roxo)
webinar → #06B6D4 (ciano)
conferencia → #F59E0B (amarelo, actual)
outro → #6B7280 (cinza)
```

No mapeamento de cada evento, incluir `metadata._categoryColor` com a cor correspondente a `evt.event_category`.

### 2. Editar `src/components/calendars/CalendarView.tsx`

Alterar `getCalendarColor` para verificar se o evento tem `metadata?._categoryColor` e usar essa cor em vez da cor do calendário. Passar o evento completo (ou a cor) em vez de apenas `calendar_id` nos pontos de renderização (MonthView, WeekView, DayView).

### 3. Editar `src/components/calendars/CalendarListView.tsx`

Mesma alteração: usar `event.metadata?._categoryColor` como override da cor do calendário na barra lateral colorida.

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useCommunityEventsForCalendar.ts` | Adicionar mapa de cores e guardar em metadata |
| `src/components/calendars/CalendarView.tsx` | Usar cor da categoria como override |
| `src/components/calendars/CalendarListView.tsx` | Usar cor da categoria como override |

