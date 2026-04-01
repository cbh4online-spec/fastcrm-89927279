

# Dynamic Imports para Libs Pesadas

## Diagnóstico

| Lib | Ficheiros | Estado actual | Acção |
|-----|-----------|---------------|-------|
| **exceljs** | `excelUtils.ts` → 7 consumidores | Import estático top-level | Converter para dynamic import |
| **@fullcalendar/\*** | `FullCalendarView.tsx` | FullCalendar lazy, mas **plugins importados estaticamente** (daygrid, timegrid, list, interaction) | Mover plugins para dynamic import |
| **@tiptap/\*** | `ui/RichTextEditor.tsx` (17 imports), `inbox/RichTextEditor.tsx` (5 imports) | Tudo estático | Lazy-load componentes inteiros |
| **@react-pdf/renderer** | 0 imports encontrados | Não usado | Nada a fazer |
| **@nivo/\*** | 0 imports encontrados | Não usado | Nada a fazer |

**@react-pdf/renderer** e **@nivo/\*** não têm imports no código — já foram removidos ou nunca foram usados directamente. Não há acção necessária.

---

## Plano de Implementação

### 1. ExcelJS — Dynamic import dentro das funções

**Ficheiro:** `src/utils/excelUtils.ts`

Remover `import ExcelJS from "exceljs"` do topo. Dentro de `parseExcelFile()` e `exportToExcel()`, fazer `const ExcelJS = (await import("exceljs")).default`. Como ambas as funções já são `async`, zero alteração na API — os 7 consumidores continuam a funcionar sem mudanças.

### 2. FullCalendar — Dynamic import dos plugins

**Ficheiro:** `src/components/calendars/FullCalendarView.tsx`

Os 4 plugins (`dayGridPlugin`, `timeGridPlugin`, `listPlugin`, `interactionPlugin`) são importados estaticamente mesmo com o FullCalendar já lazy. Solução: carregar tudo junto via `React.lazy` num wrapper que importa plugins + componente numa promise única, ou usar `useMemo` + `await import()` com estado. A abordagem mais limpa: fazer dynamic import de todos os plugins dentro do componente com um `useEffect` + `useState` loading gate.

### 3. TipTap — Lazy-load dos componentes RichTextEditor

**Ficheiros:** Consumidores de `ui/RichTextEditor.tsx` e `inbox/RichTextEditor.tsx`

Os RichTextEditors são usados em ~5 componentes, todos em contextos que não são above-the-fold (notas, email compose, block editor, inbox). Estratégia:
- Criar wrappers lazy: `const LazyRichTextEditor = lazy(() => import("@/components/ui/RichTextEditor"))` nos consumidores, ou melhor, criar um ficheiro `RichTextEditor.lazy.tsx` que re-exporta com lazy + Suspense + skeleton fallback.
- Os componentes `inbox/RichTextEditor.tsx` já são usados apenas dentro de `MessageInput.tsx` — fazer lazy import lá.

---

### Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/utils/excelUtils.ts` | Remover import estático, dynamic import dentro de cada função |
| `src/components/calendars/FullCalendarView.tsx` | Dynamic import dos 4 plugins + FullCalendar juntos |
| `src/components/ui/RichTextEditorLazy.tsx` | **Novo** — wrapper lazy com Suspense + skeleton |
| `src/components/opportunities/detail/OpportunityNotesTab.tsx` | Usar lazy import do RichTextEditor |
| `src/components/email-builder/BlockEditor.tsx` | Usar lazy import do RichTextEditor |
| `src/components/inbox/MessageInput.tsx` | Lazy import do inbox RichTextEditor |
| `src/components/email/ComposeEmailDialog.tsx` | Já usa email-builder/RichTextEditor (não @tiptap) — sem alteração |

### Estimativa de impacto
- **ExcelJS (~300KB)**: removido do bundle principal, carregado só quando utilizador clica importar/exportar
- **FullCalendar plugins (~120KB)**: removidos do bundle principal, carregados com a vista calendário
- **TipTap (~100KB)**: removido do bundle principal, carregado quando editor aparece

