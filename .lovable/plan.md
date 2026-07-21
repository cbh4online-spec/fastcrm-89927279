## Diagnóstico

- Rota pública `/store/:workspaceSlug/product/:productId` já existe em `StoreProductPage.tsx` (930 linhas).
- `ProductDetailDialog.tsx` é o local do backoffice para gerir o produto.
- Campo JSONB `products.metadata` existe e é semanticamente adequado — **sem migration necessária**.
- Componentes reutilizáveis: variantes (`useProductVariants` / `usePublicProductVariants`), bundles (`useBundles`), pedido de preço (`StorePriceRequestDialog`), carrinho (`StoreCartContext`), tracking (`ecommerceTracking`), avaliações e FAQ existentes.

## Persistência

Guardar em `products.metadata.offer_page` com estrutura tipada:
```
{ version, enabled, preset, conversionGoal, headline, subheadline, ctaLabel,
  secondaryCtaLabel, trustBadges[], sections{}, sectorConfig{}, faqItems[] }
```
Presets: `cosmetics | training | security | dropshipping | generic`.
Objetivos: `add_to_cart | buy_now | request_quote | request_contact | enroll | book_assessment | book_demo`.
Default: `enabled=false` → sem alterações a produtos existentes.

## Ficheiros a alterar / criar

**Novos:**
- `src/components/store/offer-page/offerPageTypes.ts` — tipos + defaults por preset + validação.
- `src/components/store/offer-page/StoreSmartOfferPage.tsx` — layout principal (2 colunas desktop, empilhado mobile).
- `src/components/store/offer-page/OfferProductGallery.tsx`
- `src/components/store/offer-page/OfferDecisionPanel.tsx` — passos numerados por preset.
- `src/components/store/offer-page/OfferOptionStep.tsx`
- `src/components/store/offer-page/OfferTrustBadges.tsx`
- `src/components/store/offer-page/OfferStickyCTA.tsx` — barra fixa mobile (preço + CTA).
- `src/components/store/offer-page/OfferSections.tsx` — accordion de secções configuráveis.
- `src/components/store/offer-page/OfferPresetRenderer.tsx` — mapeia preset → passos + secções ativas.
- `src/components/store/offer-page/useOfferConversion.ts` — camada de ação (add_to_cart/buy_now/request_quote/etc) reutilizando carrinho, checkout e `StorePriceRequestDialog`.
- `src/components/products/ProductOfferPageSettingsTab.tsx` — separador de configuração no backoffice.

**Alterados:**
- `src/pages/store/StoreProductPage.tsx` — lê `metadata.offer_page`; se `enabled` → renderiza `StoreSmartOfferPage`; senão mantém render atual (fallback seguro).
- `src/components/products/ProductDetailDialog.tsx` — adiciona novo `TabsTrigger` "Página de Oferta" ligado ao componente isolado (sem inflacionar o ficheiro).

## Estrutura visual

**Desktop:** grelha 2 colunas; esquerda = galeria + benefícios + conteúdo detalhado; direita = painel sticky (rating real, título, selos, passos numerados, resumo de preço com poupança real, quantidade, CTA principal).
**Mobile:** ordem imagem → título/rating → painel → CTA → benefícios → conteúdo → avaliações → FAQ → relacionados; `OfferStickyCTA` fixa em baixo.

## Presets (comportamento)

- **Cosmetics** — variantes (tamanho/aroma/pele) + quantity breaks reais + bundles reais; sem opção "subscrever" (ainda não há checkout recorrente funcional detectado).
- **Training** — modalidade + edição/sessão (só mostra dados reais) + plano; CTA "Inscrever-me" → checkout se preço existir, senão `request_contact`.
- **Security** — tipo de espaço + necessidade + tipo de solução; CTA "Pedir orçamento" via `StorePriceRequestDialog`; sem carrinho quando preço sob consulta.
- **Dropshipping** — variante + quantidade + confirmação de entrega (só dados reais); CTA `add_to_cart`/`buy_now`.
- **Generic** — imagem + título + descrição + preço + qty + variantes se existirem.

Passos vazios ocultos automaticamente. Objetivos de conversão sem implementação real ficam ocultos no seletor do backoffice.

## Backoffice

`ProductOfferPageSettingsTab` com:
- Switch on/off (default off).
- Select preset + select objetivo.
- Inputs de texto comercial (com fallback para dados existentes do produto).
- Editor de até 4 trust badges (icon Lucide + título + descrição).
- Lista de secções com switches (sem drag-and-drop; setas cima/baixo).
- Editor mínimo de FAQ (pergunta/resposta/ordem/ativo).
- Pré-visualização resumida + link "Abrir página pública".

Persistência via update ao `products.metadata` preservando outras chaves.

## Analytics

Reutiliza `ecommerceTracking` + adiciona eventos `smart_offer_view`, `smart_offer_option_selected`, `smart_offer_conversion_mode_selected`, `smart_offer_bundle_selected`, `smart_offer_cta_clicked`, `smart_offer_quote_requested` via `pushGA4` existente.

## Migration
**Nenhuma** — reutiliza `products.metadata` (JSONB já existente e apropriado).

## Riscos
- Produtos sem imagem/rating/stock — tratados com estados vazios; sem números fictícios.
- Extensão do carrinho para `variantId` se ainda não suportar — feita de forma retrocompatível apenas se necessário para preset cosmetics/dropshipping.
- `ProductDetailDialog` grande — o novo separador fica num componente isolado para não inchar o ficheiro.

## Critérios de aceitação
Todos os 22 pontos do briefing; fallback preserva a página atual; typecheck final sem novos erros.