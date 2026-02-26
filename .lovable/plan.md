

# Legenda de Cores das Categorias na Sidebar do Calendário

## Alterações

### Editar `src/components/calendars/CalendarSidebar.tsx`

Adicionar uma secção "Categorias" no final da sidebar (após os calendários virtuais) com a legenda das cores das categorias de eventos comunitários:

- Importar `CATEGORY_COLORS` de `useCommunityEventsForCalendar`
- Renderizar uma lista com bolinha colorida + label para cada categoria: Networking, Jantar, Workshop, Webinar, Conferência, Outro
- Visualmente: lista compacta com `Separator` antes, sem interacção — apenas informativa
- Só aparece se o calendário "community-events" estiver nos `virtualCalendarIds`

| Ficheiro | Acção |
|----------|-------|
| `src/components/calendars/CalendarSidebar.tsx` | Adicionar secção legenda de categorias |

