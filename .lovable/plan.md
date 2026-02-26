

# Filtrar Eventos por Categoria na Vista de Calendário

## Abordagem

Tornar a legenda de categorias na sidebar interactiva (checkboxes), e propagar as categorias seleccionadas até à página de calendário para filtrar os eventos comunitários antes de os fundir com os restantes.

## Alterações

### 1. Editar `src/components/calendars/CalendarSidebar.tsx`

- Adicionar props: `selectedCategories: string[]` e `onToggleCategory: (key: string) => void`
- Substituir as bolinhas estáticas da legenda por `Checkbox` clicáveis (estilo idêntico aos calendários, com cor da categoria)
- Manter visual compacto, apenas adicionar interactividade

### 2. Editar `src/pages/CalendarsPage.tsx`

- Adicionar estado `selectedCategories` (inicializado com todas as chaves de `CATEGORY_COLORS`)
- Passar `selectedCategories` e `onToggleCategory` à `CalendarSidebar`
- Filtrar `communityEvents` no `mergedEvents` memo: só incluir eventos cuja `metadata._categoryColor` corresponda a uma categoria seleccionada

### 3. Editar `src/components/scheduling/SchedulingHub.tsx` (se usar sidebar com community events)

- Mesma lógica de estado + filtragem, ou ignorar se não tiver calendário comunitário

| Ficheiro | Acção |
|----------|-------|
| `src/components/calendars/CalendarSidebar.tsx` | Tornar legenda interactiva com checkboxes |
| `src/pages/CalendarsPage.tsx` | Estado de categorias + filtragem de eventos |

