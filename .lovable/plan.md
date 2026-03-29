

# Fix: Texto cortado nas páginas do flipbook

## Problema

O conteúdo está a ser cortado porque `CHARS_PER_PAGE = 700` ainda é demasiado para as dimensões reais das páginas. No painel de preview (~800px de largura), o `calcDimensions` calcula páginas com ~342×480px, onde 700 caracteres com formatação markdown facilmente transborda o espaço visível. O `overflow-hidden` esconde o excesso.

## Solução

### 1. `FlipbookReader.tsx` — Reduzir `CHARS_PER_PAGE` de 700 para **450**

Com páginas de ~340px de largura e ~480px de altura, descontando header, footer e padding, cabem ~18-20 linhas de ~35 caracteres = ~630 chars teóricos. Mas com parágrafos, markdown headings e espaçamento, o limite seguro é ~450.

### 2. `FlipbookPage.tsx` — Reduzir font-size e espaçamento

- Font-size do conteúdo: `12.5px` → `11.5px`
- Line-height: `1.75` → `1.65`
- Padding: `px-6 py-6` → `px-4 py-4`
- Reduzir margins entre parágrafos: `mb-3` → `mb-2`
- Reduzir header/footer spacing

### 3. `FlipbookPage.tsx` — Adicionar scroll como fallback

Mudar `overflow-hidden` para `overflow-y-auto` com scrollbar thin/invisible para que, em caso de overflow residual, o texto seja acessível (em vez de cortado).

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `FlipbookReader.tsx` | `CHARS_PER_PAGE = 450` |
| `FlipbookPage.tsx` | Font 11.5px, line-height 1.65, padding reduzido, overflow-y-auto fallback |

