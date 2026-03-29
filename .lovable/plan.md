

# Correções Prioritárias — Design System Normalization

## Estado Atual
Muitas correções da auditoria anterior já foram aplicadas (Admin usa Table + PageHeader, EbooksList consolidado, right sidebar w-56). Restam problemas concretos de legibilidade, densidade e agrupamento.

## Correções a Implementar

### 1. ChapterThumbnail.tsx — Legibilidade
- `text-[9px]` título → `text-[10px]`
- `text-[8px]` preview → `text-[9px]`
- `text-[10px]` word count label (já aceitável, manter)

### 2. AdaptiveSidebar.tsx — Tags e labels
- Avatar fallback `text-[10px]` → manter (é 2 letras num avatar pequeno, aceitável)
- Role dropdown `text-[11px]` → `text-xs`
- Collapsed badge `text-[10px]` → manter (contadores em badges colapsados)
- Tooltip Pro/Beta `text-[10px]` → manter (tooltips são contextuais)

### 3. EbookEditor.tsx — Header buttons + toolbar
- Header action buttons: `h-7` → `h-8` para melhor hit target
- Chapter toolbar: agrupar ações IA (Gerar, Melhorar, Condensar, Expandir) num `DropdownMenu` para reduzir overflow
- Manter Undo/Redo e Img IA/Upload como botões diretos

### 4. TemplatePickerStep.tsx — Badge sizing
- Badge `text-[10px]` → `text-xs` para consistência
- Page count `text-[10px]` → `text-xs`

### 5. EbookBlockToolbar.tsx — Verificar
- Já usa `text-xs` nos labels (corrigido na ronda anterior) — confirmar e ajustar se necessário

## Ficheiros a modificar
| Ficheiro | Tipo |
|---|---|
| `ChapterThumbnail.tsx` | Micro-text fix |
| `AdaptiveSidebar.tsx` | Role label fix |
| `EbookEditor.tsx` | Button sizes + AI dropdown grouping |
| `TemplatePickerStep.tsx` | Badge text normalization |

