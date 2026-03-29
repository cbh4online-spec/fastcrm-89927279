

# Fix: Efeito de folhear páginas com react-pageflip (estilo Calameo)

## Problemas atuais

1. **Conteúdo cortado** — `CHARS_PER_PAGE = 1800` foi calibrado para páginas de largura total, mas no modo spread cada página tem metade da largura, causando overflow
2. **Efeito 3D artesanal limitado** — a implementação CSS custom não reproduz o efeito realista do Calameo (curva da página, sombra dinâmica, drag suave)
3. **`overflow-y-auto`** nas páginas de conteúdo permite scroll interno em vez de paginar corretamente

## Solução: Usar biblioteca `react-pageflip`

O Calameo usa internamente uma engine semelhante ao **StPageFlip** — uma biblioteca especializada que desenha a curva da página em canvas com sombras dinâmicas e suporte a drag do canto. Existe um wrapper React oficial: `react-pageflip`.

### Alterações

#### 1. Instalar `react-pageflip`
- `npm install react-pageflip` (wrapper para StPageFlip, MIT, zero deps)

#### 2. Reescrever `PageFlip.tsx` → usar `HTMLFlipBook`
- Substituir toda a lógica CSS custom pelo componente `HTMLFlipBook`
- Cada página é um `React.forwardRef` div com conteúdo `FlipbookPage`
- Configuração: `width: 480, height: 680, size: "stretch"`, `showCover: true`, `drawShadow: true`, `flippingTime: 800`
- Expor ref para `flipNext()` / `flipPrev()` / `turnToPage()` para integração com toolbar e teclado

#### 3. Atualizar `FlipbookReader.tsx`
- Remover lógica de spread manual (o `HTMLFlipBook` gere internamente páginas duplas)
- Usar `onFlip` callback para atualizar o número da página no toolbar
- Passar ref do flipbook para toolbar/teclado chamarem `flipNext`/`flipPrev`

#### 4. Atualizar `FlipbookPage.tsx`
- Cada página deve usar `React.forwardRef` (requisito do react-pageflip)
- Remover `overflow-y-auto` do conteúdo — usar `overflow: hidden` com `line-clamp`
- Reduzir padding para caber melhor no formato mais estreito

#### 5. Reduzir `CHARS_PER_PAGE` para ~900
- Cada página agora tem ~480px de largura × 680px de altura
- Com padding e header/footer, ~900 chars é o limite para não cortar

#### 6. `FlipbookToolbar.tsx`
- Receber ref do flipbook para chamar `flipNext()`/`flipPrev()` diretamente
- Atualizar página via `onFlip` event em vez de tracking manual de spread

## Ficheiros

| Ficheiro | Ação |
|----------|-----------|
| `package.json` | Adicionar `react-pageflip` |
| `PageFlip.tsx` | Reescrever com `HTMLFlipBook` |
| `FlipbookReader.tsx` | Simplificar — delegar flip ao HTMLFlipBook |
| `FlipbookPage.tsx` | `forwardRef` + `overflow: hidden` + menos padding |
| `FlipbookToolbar.tsx` | Integrar via ref do flipbook |

