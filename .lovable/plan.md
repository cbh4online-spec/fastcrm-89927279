

## Plano: Substituir imagem placeholder do "Tem algo para vender?" por ilustração 3D

### Problema
A secção "Tem algo para vender?" na página do marketplace (`/marketplace/metodopare`) mostra um mockup estático cinzento com um ícone de Store — não é apelativo nem relacionado com o tema.

### Solução
Substituir o placeholder por uma ilustração 3D estilizada em CSS/SVG que represente o conceito de venda no marketplace — um "cartão de produto" flutuante com efeito 3D (perspective + rotateY/rotateX), com gradientes amber/dourado coerentes com o tema dark premium do marketplace.

### Implementação
**Ficheiro**: `src/pages/c2c/C2CPublicMarketplace.tsx` — componente `SellCTA` (linhas 276-287)

Substituir o bloco `<div className="hidden md:flex justify-center">` por um componente visual 3D composto por:
- Container com `perspective: 1000px`
- Cartão de produto com `transform: rotateY(-8deg) rotateX(5deg)` e `box-shadow` com glow amber
- Dentro do cartão: imagem placeholder com gradiente, ícones de preço/estrelas/badge "Em destaque"
- Segundo cartão atrás (stack effect) com menor opacidade
- Animação subtil de hover que suaviza a rotação

O resultado será um efeito 3D de "stack de produtos" flutuante que comunica visualmente a ideia de publicar anúncios, coerente com a estética amber/dark do marketplace.

