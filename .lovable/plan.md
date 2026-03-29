

# Escalar texto do flipbook com o tamanho da página

## Problema

O texto usa tamanhos fixos em pixels (11.5px para parágrafos, 9px para headers, 10px para rodapé, etc.). Como as páginas agora têm tamanho A4 real, o texto fica desproporcionalmente pequeno — parece texto de A5 numa página A4.

## Solução

Usar **CSS `container queries`** ou, mais simplesmente, passar as dimensões calculadas para o `FlipbookPage` e aplicar um **font-size base via style inline** que escala proporcionalmente.

### Abordagem: Scale factor baseado na altura da página

1. **`PageFlip.tsx`** — passar `dims` (width/height) ao `PageWrapper` e ao `FlipbookPage`
2. **`FlipbookPage.tsx`** — receber `pageWidth`/`pageHeight` como props e calcular um `scaleFactor`:

```text
Base de referência: altura 600px = font-size 14px (tamanho legível)
scaleFactor = pageHeight / 600
fontSize base = 14 * scaleFactor (clamped entre 12px e 22px)
```

3. Aplicar o `fontSize` como style inline no container raiz de cada tipo de página, e converter todos os tamanhos fixos para `em` units:

| Elemento actual | Fixo (px) | Novo (em) |
|---|---|---|
| Parágrafo body | 11.5px | 1em |
| Heading h2 | 14px (text-sm) | 1.2em |
| Chapter header | 9px | 0.65em |
| Rodapé | 10px | 0.7em |
| Cover title | text-3xl | 2.2em |
| TOC items | text-sm | 1em |
| First-letter | text-3xl | 2.5em |

4. Padding e margins também escalam com `em`, mantendo proporção visual.

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `PageFlip.tsx` | Passar `pageWidth`/`pageHeight` como props ao `PageWrapper` |
| `FlipbookPage.tsx` | Adicionar props de dimensão, calcular `scaleFactor`, converter tamanhos fixos para `em` com font-size base dinâmico |

### Resultado

O texto escala automaticamente com o tamanho da página — páginas maiores = texto maior, mantendo a mesma proporção visual de um livro real.

