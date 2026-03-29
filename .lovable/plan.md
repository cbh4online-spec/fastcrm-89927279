

# Fix: eBook não respeita o template escolhido

## Diagnóstico

O template é gravado na DB (`template_id` + `global_styles`) mas **nunca é lido nem aplicado**:

1. **Tipo `Ebook`** em `useEbooks.ts` não inclui `template_id` nem `global_styles`
2. **`EbookEditor`** não lê `global_styles` do eBook carregado
3. **`EbookRichEditor`** usa classes CSS fixas (prose defaults) — ignora cores/fontes do template
4. **`FlipbookReader`** não recebe nem aplica style tokens

## Plano de Correção

### 1. Expandir tipo `Ebook` (`useEbooks.ts`)
- Adicionar `template_id?: string | null` e `global_styles?: Record<string, unknown> | null` ao interface `Ebook`
- Incluir no `Pick` do `useUpdateEbook` para permitir edição

### 2. Aplicar estilos no Editor (`EbookEditor.tsx`)
- Ler `ebook.global_styles` quando o eBook carrega
- Converter os `StyleTokens` (primaryColor, headingFont, bodyFont, etc.) em CSS variables inline (`--ebook-primary`, `--ebook-heading-font`, `--ebook-body-font`)
- Passar essas variables como `style` prop no container do editor

### 3. Consumir CSS variables no `EbookRichEditor.tsx`
- Substituir `font-serif` fixo por `font-[var(--ebook-body-font,serif)]`
- Aplicar `color: var(--ebook-primary)` nos headings via style inline quando disponível
- Manter fallback para os valores actuais (sem template = comportamento inalterado)

### 4. Propagar estilos ao `FlipbookReader`
- Aceitar prop `styleTokens?: Partial<StyleTokens>`
- Aplicar as mesmas CSS variables no container do flipbook
- Passar de `EbookEditor` → `FlipbookReader` usando `ebook.global_styles`

### 5. Propagar no `FlipbookPage`
- Usar as CSS variables para cores de fundo, texto e fontes nas páginas renderizadas

## Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useEbooks.ts` | Tipo + update mutation |
| `src/components/ebooks/EbookEditor.tsx` | Ler e injetar CSS vars |
| `src/components/ebooks/EbookRichEditor.tsx` | Consumir CSS vars com fallback |
| `src/components/ebooks/FlipbookReader.tsx` | Aceitar + propagar styleTokens |
| `src/components/ebooks/FlipbookPage.tsx` | Aplicar CSS vars nas páginas |

## Resultado
- eBooks criados com template mostram as cores, fontes e estilo visual do template escolhido
- eBooks sem template continuam com o comportamento actual (fallback)
- Zero breaking changes

