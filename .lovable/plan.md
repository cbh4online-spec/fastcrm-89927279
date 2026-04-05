
# Conformidade Legal de Promoções (DL 70/2007 + Diretiva Omnibus)

## Diagnóstico

A legislação portuguesa (DL 70/2007) e a Diretiva Omnibus (EU 2019/2161, transposta pelo DL 108/2021) exigem que promoções na loja apresentem:

1. **Preço anterior mais baixo dos últimos 30 dias** (Omnibus) — não apenas o preço "original"
2. **Percentagem de desconto** calculada sobre o preço mais baixo dos 30 dias
3. **Período da promoção** (datas de início e fim)
4. **Motivo/tipo da promoção** (saldos, liquidação, promoção)

### Estado atual
- A tabela `products` **não tem** campos de promoção (`compare_at_price`, `promo_start_at`, `promo_end_at`)
- Existe `product_price_history` com histórico de preços — pode ser usado para calcular o preço mais baixo dos últimos 30 dias
- O `StoreProductCard` só mostra preço riscado para descontos B2B (tier pricing), não para promoções gerais
- Não há mecanismo para o admin definir um produto como "em promoção"

## Plano de Implementação

### 1. Migração DB — Adicionar campos de promoção à tabela `products`

Novos campos:
- `compare_at_price` (numeric, nullable) — preço de referência antes da promoção
- `promo_start_at` (timestamptz, nullable) — início da promoção
- `promo_end_at` (timestamptz, nullable) — fim da promoção
- `promo_label` (text, nullable) — label opcional (ex: "Saldos", "Black Friday")
- `lowest_price_30d` (numeric, nullable) — preço mais baixo nos últimos 30 dias (Omnibus)

### 2. Trigger DB — Calcular `lowest_price_30d` automaticamente

Trigger que, ao inserir/atualizar `compare_at_price`, consulta `product_price_history` dos últimos 30 dias e preenche `lowest_price_30d`.

### 3. Atualizar `StoreProductCard` e `StoreProductPage`

Quando o produto tem `compare_at_price` e está dentro do período de promoção:
- Mostrar preço atual em destaque
- Preço anterior riscado = `lowest_price_30d` (Omnibus compliant)
- Badge com percentagem de desconto
- Label da promoção (se definida)
- Texto legal: "Preço mais baixo nos últimos 30 dias: €XX.XX" (obrigatório Omnibus)
- Contador de fim de promoção (se `promo_end_at` definido)

### 4. Atualizar `getStorePrice` para considerar promoções

A função deve verificar se o produto está em promoção ativa (dentro do período) e retornar o `base_price` como preço efetivo quando em promoção, com `compare_at_price` como referência.

### 5. Badges e labels legais no catálogo

- Badge "PROMOÇÃO" / "SALDOS" visível no card
- Percentagem de desconto calculada sobre o `lowest_price_30d` (não sobre o `compare_at_price`)

## Ficheiros a criar/alterar

| Ficheiro | Alteração |
|----------|-----------|
| **Migração SQL** | Adicionar campos de promoção à tabela `products` + trigger `lowest_price_30d` |
| `src/hooks/useStoreTierPricing.ts` | Expandir `getStorePrice` para considerar promoções |
| `src/components/store/StoreProductCard.tsx` | Mostrar preço Omnibus, badge promoção, percentagem |
| `src/pages/store/StoreProductPage.tsx` | Mostrar info legal de promoção no PDP |
| `src/components/store/StorePromoBadge.tsx` | Novo — badge reutilizável de promoção com info Omnibus |
| `src/hooks/useStoreProducts.ts` | Incluir novos campos no select da query |

## Lógica de apresentação

```text
SE produto tem compare_at_price E está dentro do período (promo_start_at..promo_end_at):
  → Preço mostrado = base_price (preço promocional)
  → Preço riscado = lowest_price_30d (Omnibus)
  → Percentagem = ((lowest_price_30d - base_price) / lowest_price_30d) * 100
  → Texto legal: "Preço mais baixo nos últimos 30 dias: €lowest_price_30d"
  → Badge: "PROMOÇÃO" ou promo_label personalizada

SE produto tem compare_at_price MAS fora do período:
  → Preço mostrado = base_price (preço normal)
  → Sem indicação de promoção
```

## Critérios de Aceitação

- Promoções mostram o preço mais baixo dos últimos 30 dias (Omnibus)
- Percentagem de desconto calculada sobre o preço Omnibus
- Badge de promoção visível no card e na página de produto
- Texto legal obrigatório presente quando há promoção ativa
- Promoções expiradas não são mostradas
- Sem regressões nos preços B2B (tier pricing mantém comportamento atual)
