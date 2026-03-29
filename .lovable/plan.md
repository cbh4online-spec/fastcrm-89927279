

# AUDITORIA UI/UX — Ronda 2 (Inspeção Crítica)

## 1. RESUMO EXECUTIVO

**Score atual:** 7.0/10 — Melhorou desde a ronda anterior, mas persistem problemas significativos que impedem a perceção de produto premium.

**Principais áreas fracas:**
- **ChapterThumbnail** usa `text-[6px]` e `text-[7px]` — ilegível, aspecto de protótipo
- **EbookBlockToolbar** mantém `text-[10px]` em 8 locais — visualmente denso demais
- **TemplatePickerStep** usa `text-[9px]` em badges — inconsistente com a correção anterior
- **Sidebar** mantém `text-[9px]` em tags Pro/Beta e `text-[10px]` em section labels
- **Editor toolbar** continua com `h-7` em todos os botões — demasiado pequenos para produtividade
- **Editor right sidebar** (`w-48`) é estreita demais — branding inputs ficam comprimidos
- **Admin table** continua a usar `<table>` raw em vez do componente `Table` do shadcn
- **Gallery page** não usa `PageHeader` — inconsistente com o resto do app
- **EbooksList** ainda tem um dialog de criação interno duplicado (Manual/IA) que nunca deveria ser acessível dado que o fluxo principal agora usa o modal do `EbooksPage`
- **TemplateGalleryFilters** usa botões `h-7 text-xs` estilo outline — deveria usar pill/tabs para consistência

---

## 2. PROBLEMAS POR GRAVIDADE

### CRÍTICOS
| # | Ecrã | Problema | Correção |
|---|---|---|---|
| 1 | ChapterThumbnail | `text-[6px]` e `text-[7px]` — completamente ilegível, abaixo de qualquer standard | Aumentar para `text-[9px]` (título) e `text-[8px]` (preview), label para `text-xs` |
| 2 | EbookEditor toolbar | 12 botões `h-7` sem agrupamento, overflow em <1400px | Agrupar IA actions num `DropdownMenu`, manter undo/redo/titulo diretos, subir para `h-8` |

### ALTOS
| # | Ecrã | Problema | Correção |
|---|---|---|---|
| 3 | TemplatePickerStep | `text-[9px]` em badges de categoria e contagem de páginas | Subir para `text-xs` |
| 4 | AdaptiveSidebar | `text-[9px]` em Pro/Beta tags, `text-[10px]` em section labels | Pro/Beta → `text-[10px]`, sections → `text-xs` |
| 5 | EbookBlockToolbar | `text-[10px]` em 8 labels de bloco — parece amador | Subir para `text-xs` |
| 6 | EbooksList | Dialog de criação interna (Manual/IA) duplicado — fluxo morto | Remover dialog interno; manter apenas o modal centralizado |
| 7 | Editor branding sidebar | `text-[10px]` em labels + inputs `h-7 text-xs` muito comprimidos | Labels → `text-xs`, inputs → `h-8` |

### MÉDIOS
| # | Ecrã | Problema | Correção |
|---|---|---|---|
| 8 | AdminPage | `<table>` raw — sem Table component do design system | Migrar para `Table, TableHead, TableRow, TableCell` |
| 9 | GalleryPage | Não usa `PageHeader` — header manual inconsistente | Usar `PageHeader` com contagem de templates |
| 10 | TemplateGalleryFilters | Botões outline `h-7` para filtros — deveria usar pill style | Converter para pill tabs como no `PageHeader` |
| 11 | EbookEditor | Right sidebar `w-48` — estreita para os inputs de contacto | Aumentar para `w-56` |

---

## 3. PLANO DE CORREÇÃO

### Batch 1 — Legibilidade Crítica (5 ficheiros)
1. **ChapterThumbnail.tsx** — `text-[6px]` → `text-[9px]`, `text-[7px]` → `text-[9px]`, `text-[9px]` word count → `text-[10px]`, label `text-[10px]` → `text-xs`
2. **TemplatePickerStep.tsx** — `text-[9px]` badges → `text-[10px]`
3. **AdaptiveSidebar.tsx** — Pro/Beta tags `text-[9px]` → `text-[10px]`, section labels `text-[10px]` → `text-xs`
4. **EbookBlockToolbar.tsx** — All `text-[10px]` → `text-xs`
5. **EbookEditor.tsx** — Branding labels `text-[10px]` → `text-xs`, editor buttons credit badges keep `text-[10px]` (acceptable for metadata), right sidebar `w-48` → `w-56`, inputs `h-7` → `h-8`

### Batch 2 — UX e Consistência (4 ficheiros)
6. **EbooksList.tsx** — Remove dead dialog de criação (Manual/IA) — lines 239-309 e state associado
7. **EbookEditor.tsx** toolbar — Agrupar AI actions (Gerar/Melhorar/Condensar/Expandir) num DropdownMenu, media actions (Img IA/Upload) noutro; manter undo/redo/titulo diretos; botões → `h-8`
8. **EbookTemplatesAdminPage.tsx** — Migrar para `Table` component do shadcn/ui
9. **EbookTemplateGalleryPage.tsx** — Usar `PageHeader` com count de templates

### Batch 3 — Polish
10. **TemplateGalleryFilters.tsx** — Converter para pill style (mesmo pattern do `PageHeader` tabs)

### Resultado esperado
- Score: 7.0 → **8.0/10**
- Zero instâncias de `text-[6px]`/`text-[7px]` no módulo eBooks
- Toolbar do editor utilizável sem overflow
- Fluxo de criação simplificado (single entry point)
- Componentes do design system usados consistentemente
- Hierarquia visual clara em todas as páginas do módulo

