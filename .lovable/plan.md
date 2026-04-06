

## Plano: IA para Verificar e Preencher Peso dos Produtos

### Diagnóstico
- A tabela `products` já tem a coluna `weight` (numeric), mas **0 dos 1643 produtos** têm peso preenchido.
- O checkout usa `weight` para calcular portes, e quando não existe, assume 0.5 kg — valor arbitrário que causa preços de envio incorretos.
- A edge function `ai-product-assistant` já suporta múltiplos modos mas nenhum estima peso.

### Implementação

#### 1. Novo modo `estimate-weight` na Edge Function `ai-product-assistant`
Adicionar um modo que recebe nome, categoria, especificações e dimensões do produto e retorna:
- `weight_kg`: peso estimado em kg
- `confidence`: `high` | `medium` | `low`
- `reasoning`: explicação breve da estimativa
- `source_hint`: referência (ex: "Baseado em câmaras IP similares ~300g")

A IA usa o nome, SKU, categoria e specs para estimar o peso real do produto. Para produtos com specs como dimensões ou materiais, a confiança será maior.

#### 2. Ação em Massa — Preencher Pesos via IA
Nova edge function `ai-batch-estimate-weights` que:
- Recebe uma lista de product IDs (ou workspace_id para todos sem peso)
- Busca nome, categoria, specs de cada produto
- Chama a IA para estimar peso em batch (agrupando por categoria para contexto)
- Atualiza a coluna `weight` nos produtos com confiança `high` ou `medium`
- Retorna relatório com estimativas e níveis de confiança

#### 3. UI no Backoffice — Painel de Peso
Componente `ProductWeightAIPanel.tsx` integrado no `ProductDetailDialog`:
- Mostra peso atual (ou "Não definido")
- Botão "Estimar com IA" que chama o modo `estimate-weight`
- Preview da estimativa com confiança antes de guardar
- Botão para aplicar o valor estimado

#### 4. UI na Página de Gestão da Loja — Ação em Massa
No `StoreProductsAdminPage`, adicionar:
- Indicador de quantos produtos estão sem peso
- Botão "Preencher pesos com IA" que dispara o batch
- Progress bar durante o processamento
- Resumo final: X produtos atualizados, Y necessitam revisão manual

#### 5. Validação no Checkout
Melhorar `useCheckoutPricing.ts`:
- Quando `weight` é null, marcar o item como "peso estimado" 
- Log de aviso quando peso é fallback (0.5 kg)

### Ficheiros a criar/modificar

**Modificados:**
- `supabase/functions/ai-product-assistant/index.ts` — Novo modo `estimate-weight`
- `src/components/products/ProductDetailDialog.tsx` — Painel de peso com IA
- `src/pages/StoreProductsAdminPage.tsx` — Indicador e ação em massa

**Novos:**
- `supabase/functions/ai-batch-estimate-weights/index.ts` — Estimativa em batch
- `src/components/products/ProductWeightAIPanel.tsx` — UI de estimativa individual
- `src/components/store/admin/BatchWeightEstimateDialog.tsx` — Dialog para batch

### Impacto
- Portes de envio calculados com precisão real em vez de 0.5 kg default
- Google Product Feed e Facebook Feed passam a incluir `g:shipping_weight` correto
- Redução de reclamações por diferença entre portes estimados e reais

