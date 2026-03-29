

# Fix: Flipbook reader demasiado pequeno

## Problema

No viewport actual (1201×860), o `calcDimensions` calcula cada página com ~520×740px mas o livro renderiza muito mais pequeno. Causas:

1. **`maxWidth={600}` e `maxHeight={900}`** no HTMLFlipBook limitam o crescimento
2. **Desktop calculation** é conservadora — `Math.min(w, 520)` cap desnecessário
3. **Fullscreen** usa `vw * 0.42` que é demasiado restritivo
4. **`size="stretch"`** combina mal com os min/max constraints baixos

## Solução

### `PageFlip.tsx` — Recalcular dimensões

**Desktop** (≥1024px):
- Usar ~75% da altura disponível em vez de `vh - 120`
- Remover o cap de `520` na largura — permitir até `600`
- `maxH = Math.min(vh - 100, 860)` em vez de `780`

**Fullscreen**:
- Usar `vw * 0.46` em vez de `0.42`
- Calcular com base na altura real: `availH * 0.9 / 1.4`

**Tablet** (640–1024px):
- Aumentar de `vw * 0.38` para `vw * 0.42`, max 400

**HTMLFlipBook props**:
- `maxWidth`: 600 → **800**
- `maxHeight`: 900 → **1100**
- `minWidth`: 240 → **280**
- `minHeight`: 340 → **400**

### Resultado esperado

O livro ocupará ~80% da área disponível em vez dos ~40% actuais, mantendo a proporção 1:1.4.

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/ebooks/PageFlip.tsx` | Aumentar dimensões em `calcDimensions`, aumentar min/max props |

