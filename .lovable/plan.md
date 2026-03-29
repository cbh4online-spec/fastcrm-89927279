

# Efeito de virar página 3D (estilo Calameo)

## O que muda

Substituir a animação atual (slide simples com ligeiro rotateY) por um **efeito de virar página realista em 3D**, onde a página roda sobre o eixo central do livro como se estivéssemos a folhear um livro real. O utilizador poderá **arrastar o canto da página** com o rato ou simplesmente clicar para virar.

## Como funciona

O livro mostra **duas páginas lado a lado** (spread), como um livro aberto. Ao virar:
1. A página da direita levanta-se e roda 180° sobre o eixo Y (lombada)
2. O verso da página fica visível durante a rotação (mostra a página seguinte)
3. A página assenta do lado esquerdo

O utilizador pode arrastar o canto inferior-direito da página para controlar a velocidade do flip, ou clicar para flip automático.

## Implementação técnica

### Novo componente: `PageFlip.tsx`
- Container com `perspective: 1200px` e layout de duas páginas lado a lado
- Cada "folha" é um `div` com `transform-style: preserve-3d` e duas faces (`front` / `back`) usando `backface-visibility: hidden`
- Animação via CSS `rotateY(0deg)` → `rotateY(-180deg)` com `transform-origin: left center`
- Suporte a **drag** no canto: `onMouseDown`/`onMouseMove`/`onMouseUp` mapeiam posição X do rato para ângulo de rotação (0° a -180°)
- Ao soltar: snap para frente (< 90°) ou completa o flip (≥ 90°)

### Alteração: `FlipbookReader.tsx`
- Substituir o bloco `AnimatePresence` + `motion.div` pelo novo `PageFlip`
- Manter toda a lógica de páginas, toolbar, thumbnails, teclado
- Adaptar o estado para tracking de par de páginas (esquerda/direita) em vez de página única
- Touch swipe continua a funcionar mas agora dispara o flip 3D

### Alteração: `FlipbookPage.tsx`
- Sem grandes mudanças — cada página continua a renderizar o mesmo conteúdo
- Ajustar tamanho para metade da largura (cada página ocupa metade do spread)

### Alteração: `FlipbookToolbar.tsx`
- Atualizar display de página para mostrar par (ex: "3-4 / 20")

## Ficheiros

| Ficheiro | Ação |
|----------|------|
| `PageFlip.tsx` | **Novo** — componente de flip 3D com drag support |
| `FlipbookReader.tsx` | Integrar PageFlip, layout spread duas páginas |
| `FlipbookPage.tsx` | Ajustar dimensões para half-spread |
| `FlipbookToolbar.tsx` | Display de par de páginas |

