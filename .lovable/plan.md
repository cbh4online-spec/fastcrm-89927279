

## Reorganizar layout do detalhe de contacto para caber no ecrã

### Problema

O header ocupa demasiado espaço vertical: nome, badges, tags e botões de ação estão todos numa linha que quebra em várias. Os "Destaques" abaixo ocupam mais espaço. Resultado: o conteúdo útil fica abaixo do fold.

### Alterações

**1. Header mais compacto (`ENIContactDetailWithSidebar.tsx`)**
- Reduzir padding do header de `py-5` para `py-3`
- Reduzir avatar para tamanho `sm` (de `md`)
- Nome de `text-2xl` para `text-xl`
- Mover botões de ação secundários (Convidar B2B, Nova Fatura) para dentro do dropdown `...`
- Manter visíveis apenas: "Enviar Email" e "Analisar com IA" + dropdown
- Tags: limitar a 3 visíveis com "+N mais" badge colapsável

**2. Highlights mais compactos (`EntityHighlightsGrid.tsx`)**
- Reduzir de `grid-cols-2 sm:grid-cols-3` para `grid-cols-4` em desktop
- Reduzir padding interno dos cards de `p-3` para `p-2`
- Reduzir margem inferior de `mb-6` para `mb-4`

**3. Reduzir espaçamento geral**
- Breadcrumbs: `pt-4` → `pt-2`
- Gap entre secções overview: `space-y-6` → `space-y-4`
- Grids de secções: `gap-6` → `gap-4`

### Ficheiros

| Ficheiro | Alteração |
|---|---|
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Header compacto, botões condensados, tags limitadas |
| `src/components/entity/EntityHighlightsGrid.tsx` | Grid 4 colunas, padding reduzido |
| `src/components/entity/InlineHeaderTags.tsx` | Limitar tags visíveis com "+N" |

