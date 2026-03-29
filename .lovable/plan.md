

# Fix: Layout responsivo e texto cortado no flipbook

## Problema

O texto está a ser cortado porque as dimensões do `HTMLFlipBook` são fixas (460×640px) e não se adaptam ao ecrã. Em mobile o livro fica demasiado grande e em desktop não aproveita o espaço. O `CHARS_PER_PAGE = 900` pode ser excessivo para ecrãs pequenos.

## Solução

### 1. `PageFlip.tsx` — Dimensões dinâmicas baseadas no viewport

Substituir largura/altura fixas por cálculo dinâmico usando `window.innerWidth` e `window.innerHeight`:

- **Mobile** (< 640px): `usePortrait={true}` (página única), largura ~90vw, altura proporcional
- **Tablet** (640–1024px): spread mode, ~280×400px por página
- **Desktop** (> 1024px): spread mode, ~460×640px por página  
- **Fullscreen**: maximizar com base no viewport real

Usar `useEffect` + `resize` listener para recalcular ao redimensionar.

Aumentar `maxWidth` e `maxHeight` para permitir que o livro cresça em ecrãs grandes.

### 2. `FlipbookReader.tsx` — CHARS_PER_PAGE dinâmico

Reduzir `CHARS_PER_PAGE` de 900 para **700** — o texto actual está demasiado denso e transborda. Valor fixo mais conservador resolve o corte sem necessitar de cálculo dinâmico.

Remover `max-w-[680px]` constraint da `PublicEbookPage.tsx` para permitir que o container cresça.

### 3. `FlipbookPage.tsx` — Tipografia adaptativa

- Reduzir font-size do conteúdo de `13.5px` para `12.5px`
- Reduzir padding: `px-6 py-6` → `px-5 py-5`
- Garantir `overflow-hidden` em todo o conteúdo

### 4. `PublicEbookPage.tsx` — Container responsivo

Substituir `max-w-[680px]` por `max-w-5xl` para dar mais espaço ao spread em desktop.

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `PageFlip.tsx` | Dimensões dinâmicas com resize listener, portrait mode em mobile |
| `FlipbookReader.tsx` | CHARS_PER_PAGE = 700 |
| `FlipbookPage.tsx` | Reduzir font-size e padding |
| `PublicEbookPage.tsx` | Aumentar max-width do container |

