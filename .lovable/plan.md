
Diagnóstico
- A captura mostra que o carrinho abandonado já aparece no separador “Carrinhos”, por isso o bug imediato parece resolvido.
- Ainda há inconsistência estrutural no código:
  - `StoreCartsTab.tsx` lê `store_abandoned_carts`
  - `useAbandonedCarts.ts` mistura `abandoned_carts` + `store_abandoned_carts`
  - `AbandonedCartsPage.tsx` e `StoreAbandonedCartsTab.tsx` ainda usam `checkout_abandoned_carts`
- Os estados não estão normalizados (`abandoned`, `pending`, `enrolled`, `in_progress`, `recovered`, `expired`, `exited`), o que pode voltar a causar diferenças entre KPIs, filtros e listas.
- Há também um desfasamento em “Carrinhos Ativos”: a regra de “Ao vivo” usa `last_activity_at`, mas o texto mostrado usa `cart_updated_at`, daí aparecer “há 4 dias”.

Decisões de produto/UX
- Na analytics da Loja, `store_abandoned_carts` deve ser a fonte canónica.
- Os fluxos antigos de checkout devem ficar separados até validação explícita, para não quebrar recuperação legacy.
- “Carrinhos Ativos” deve mostrar “última atividade” com base no mesmo campo que define o estado ativo.

Estrutura técnica
- Criar um normalizador/config partilhado para carrinhos abandonados:
  - labels de estado
  - agrupamentos para filtros/KPIs
  - mapeamento de campos (`items/cart_items`, `subtotal/cart_value`, datas)
- Reaproveitar essa camada em:
  - `src/hooks/useAbandonedCarts.ts`
  - `src/components/store/dashboard/AbandonedCartsPanel.tsx`
  - `src/components/store/StoreCartsTab.tsx`
- Auditar sem mexer já no backend; só rever permissões se o problema voltar a surgir por workspace.

Plano de implementação
1. Centralizar a normalização dos estados e campos dos carrinhos abandonados.
2. Ajustar `useAbandonedCarts.ts` e `useAbandonedCartStats()` para usar a mesma lógica de contagem e filtros.
3. Alinhar `AbandonedCartsPanel.tsx` com `StoreCartsTab.tsx` para que totais, badges e filtros devolvam os mesmos números.
4. Corrigir a semântica temporal em `StoreCartsTab.tsx` para “Ao vivo”/“última atividade”.
5. Rever `AbandonedCartsPage.tsx`, `StoreAbandonedCartsTab.tsx` e `RecoverCartPage.tsx` para separar claramente “Loja” vs “Checkout legacy”.
6. Fazer QA completo em loading, vazio, erro, filtros, detalhe, permissões e mobile.

Critérios de aceitação
- Os números de “Carrinhos” e “Abandonados” coincidem para o mesmo workspace.
- O filtro de pendentes inclui carts com estado `abandoned` quando isso representa abandono ativo.
- Os badges e labels aparecem traduzidos e consistentes.
- O bloco “Carrinhos Ativos” deixa de mostrar “Ao vivo” com copy temporal contraditória.
- Nenhum ecrã da Loja volta a mostrar 0 quando existem registos em `store_abandoned_carts`.

Riscos e pontos por validar
- Se quiseres misturar histórico de Loja + Checkout num único dashboard, é preciso decisão funcional antes da consolidação.
- Se os ecrãs legacy ainda forem usados operacionalmente, não devem ser repontados sem validar o recover flow antigo.
- Se a discrepância só acontecer em alguns workspaces, então além do frontend será preciso validar permissões de leitura na base de dados.
