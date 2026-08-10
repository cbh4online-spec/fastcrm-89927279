# Ficha de produto pública — corrigir responsividade da Buy Box

## Diagnóstico

Na captura (viewport ~1180px), o botão "Adicionar ao carrinho" aparece cortado ("dicionar ao car") e os dois cartões do passo 1 ficam esmagados.

Causa confirmada no código: os componentes dentro da Buy Box usam breakpoints de **viewport** (`sm:`, `md:`) apesar de viverem numa coluna fixa de **320px** (`lg:grid-cols-[1fr_1fr_320px]` em `StoreProductPage.tsx`). A partir de 640px de ecrã, o Tailwind ativa layouts de 2–3 colunas dentro de uma coluna estreita:

- `PurchaseModeChooser`: `sm:grid-cols-2` → 2 cartões em ~280px úteis; o botão de 11 unidades de altura com ícone + texto longo transborda.
- `BundleTierSelector`: `grid-cols-2 sm:grid-cols-3`.
- `StoreCheaperAlternatives`: `grid gap-4 sm:grid-cols-3`.

O projeto já tem `@tailwindcss/container-queries` ativo, por isso a correção certa é passar estes blocos a **container queries** (reagem à largura real do painel, não do ecrã).

## O que vai mudar

1. **Contentor de consulta na Buy Box** — marcar o painel sticky como container (`@container`), sem alterar o layout desktop nem a lógica.
2. **PurchaseModeChooser** — cartões empilhados por omissão; só passam a 2 colunas quando o contentor tem largura suficiente (`@md:grid-cols-2`). Botão principal com texto que nunca corta: altura mantida, `min-w-0`, texto quebra/encolhe e ícone opcional em larguras muito pequenas.
3. **BundleTierSelector** — grelha por container (`grid-cols-1` → `@sm:grid-cols-2` → `@md:grid-cols-3`), preços e etiquetas com `min-w-0`/`truncate` já existentes preservados.
4. **StoreCheaperAlternatives (modo compacto)** — lista/grelha por container em vez de `sm:grid-cols-3`.
5. **SellerContactBlock e blocos de preço/quantidade** — garantir `flex-wrap` e `min-w-0` para que preço + IVA + badges de desconto não empurrem a coluna.
6. **Revisão mobile (<768px)** — confirmar que a Buy Box empilha corretamente, que a barra fixa de compra (`StoreMobileConversionBar`/`StoreStickyAddToCart`) não duplica o CTA visível nem tapa conteúdo, e que a galeria de miniaturas mantém scroll horizontal.

## Validação

Screenshots via Playwright na ficha de produto em 4 larguras — 390 (telemóvel), 768 (tablet), 1180 (o caso reportado) e 1440 — a confirmar:
- CTA "Adicionar ao carrinho" sempre legível e clicável;
- sem overflow horizontal na página;
- passos 1–4 do painel legíveis em coluna estreita;
- sem erros de consola.

## Notas técnicas

- Apenas alterações de apresentação (classes Tailwind/estrutura de markup); nenhuma alteração de lógica de negócio, preços ou dados.
- Ficheiros previstos: `src/pages/store/StoreProductPage.tsx`, `src/components/store/purchase/PurchaseModeChooser.tsx`, `BundleTierSelector.tsx`, `SellerContactBlock.tsx`, `src/components/store/sections/StoreCheaperAlternatives.tsx`.

## Critérios de aceitação

- Em 320–360px de largura de painel, os cartões "Comprar agora" e "Fazer uma oferta" ficam empilhados e completos.
- Nenhum texto de botão truncado em qualquer breakpoint.
- Sem regressão visual em ≥1440px (mantém 2 cartões lado a lado).
