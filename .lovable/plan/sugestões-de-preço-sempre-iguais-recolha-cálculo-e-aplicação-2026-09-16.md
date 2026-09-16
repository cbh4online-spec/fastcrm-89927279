# Sugestões de preço sempre iguais: recolha, cálculo e aplicação

## Diagnóstico (verificado nos dados)

1. **As 33 sugestões que vê no ecrã são antigas.** Foram criadas entre 5 de agosto e 14 de setembro (a mais recente às 20:03 de 14/09) e continuam por aplicar. Nada as apaga nem as recalcula, por isso aparecem sempre as mesmas, com preços que já não correspondem à realidade atual.
2. **O botão "Atualizar Todos os Preços" não gera sugestões.** Só manda recolher preços da concorrência produto a produto. Não recalcula nem substitui as sugestões antigas.
3. **O ajuste automático nunca ficou ligado.** A configuração do ajuste automático deste espaço de trabalho não tem qualquer registo gravado — ou seja, a percentagem e o interruptor nunca chegaram a ser guardados (o erro de permissões só foi corrigido depois). Sem esse registo, o processo automático não altera preços.
4. **As sugestões geradas pelo processo automático nascem já marcadas como aplicadas**, logo nunca aparecem na lista. A lista mostra apenas o histórico antigo de outra origem.
5. **A recolha de referências está a funcionar**: existem 418 referências vivas, a mais recente recolhida hoje às 17:16. Vários produtos têm entre 3 e 9 lojas de referência; outros ficaram sem nenhuma e, corretamente, têm o valor de concorrência vazio.

Conclusão: o que está em falta não é a recolha, é o passo que **converte referências em sugestões atuais** e o **registo de configuração** que autoriza a aplicação.

## Decisões de produto/UX

1. **Sugestões passam a ter validade.** Uma sugestão só é mostrada se tiver sido calculada nas últimas 24 horas e se ainda fizer sentido face ao preço atual do produto. Tudo o que estiver fora disso deixa de ser mostrado.
2. **Uma sugestão por produto.** Ao recalcular, a sugestão anterior desse produto é substituída, nunca acumulada.
3. **"Atualizar Todos os Preços" passa a fazer as duas coisas**: recolher referências e, a seguir, recalcular as sugestões com a regra atual (percentagem abaixo do concorrente mais baixo, com travão da margem mínima). No fim mostra quantos produtos foram analisados, quantas sugestões novas há e quantos ficaram sem referências.
4. **Cada sugestão mostra em que se baseia**: loja usada, número de referências, data da recolha e se ficou limitada pela margem mínima. Sugestões com uma única referência ficam marcadas como "pouco sustentada".
5. **Descartar deixa de fingir que foi aplicado.** Passa a existir estado próprio para "descartada", separado de "aplicada", para o histórico ser verdadeiro.
6. **Estado do ajuste automático visível.** Se a configuração ainda não estiver gravada, o ecrã diz claramente "ajuste automático desligado — nunca foi guardado" e o interruptor cria o registo à primeira utilização.
7. **Limpeza única** das sugestões antigas por aplicar (as 33), para a lista partir de um estado verdadeiro.

## Estrutura técnica

- **Base de dados** (aditivo): em `price_optimization_logs` acrescentar `status` (`pending` | `applied` | `dismissed` | `superseded`), `expires_at`, `refs_count`, `source_name`, `limited_by_margin`. `applied` mantém-se para compatibilidade. Índice por `(workspace_id, product_id, status)`. Marcar as sugestões atuais por aplicar como `superseded`.
- **Novo cálculo partilhado**: extrair para `src/lib/pricing/priceSuggestions.ts` a função pura que, dadas as referências vivas, o preço atual, o custo total e a margem mínima, devolve a sugestão (preço, motivo, limitada pela margem, referência usada). Reutiliza `undercutPricing.ts`, sem duplicar regras. Cópia Deno em `supabase/functions/_shared/`.
- **Edge Function `compare-prices`**: depois de gravar referências, calcula e grava a sugestão `pending` do produto, marcando a anterior como `superseded`. Se não houver referências vivas, apaga a sugestão pendente.
- **Edge Function `auto-price-monitor`**: passa a usar o mesmo módulo; quando o ajuste automático está desligado, grava sugestões `pending` em vez de nada; quando está ligado, aplica e grava `applied`.
- **Frontend**: `useStoreAdminProducts.ts` filtra por `status = 'pending'` e `expires_at > now()`; `applySuggestion` grava `applied`, `dismissSuggestion` grava `dismissed`; `updateAllPrices` recolhe e recalcula em lote com progresso. `PricingIntelligenceSection.tsx` mostra data, referências, loja base, aviso de referência única e estado do ajuste automático.
- **Testes**: casos de sugestão válida, sugestão expirada, sem referências, limitada pela margem, substituição da sugestão anterior e produto excluído.

## Plano de implementação

1. Migração aditiva em `price_optimization_logs` + marcação das sugestões antigas como substituídas.
2. Módulo puro de sugestões + testes.
3. Atualizar `compare-prices` e `auto-price-monitor` para gravar/substituir sugestões com o novo estado.
4. Atualizar hook e ecrã (filtros, datas, referências, avisos, estado do ajuste automático).
5. Typecheck, testes de pricing e publicação das funções.

## Critérios de aceitação

- Nenhuma sugestão com mais de 24 horas aparece no ecrã.
- No máximo uma sugestão por produto.
- "Atualizar Todos os Preços" produz sugestões novas e resumo do que aconteceu.
- Cada sugestão indica loja base, número de referências e data.
- Descartar não fica registado como aplicado.
- O ecrã mostra corretamente se o ajuste automático está ligado ou nunca foi guardado.

## Riscos e pontos por validar

- Produtos sem custo conhecido continuam sem sugestão (não há como validar a margem) — ficam listados como "sem dados de custo".
- Recolher referências para todo o catálogo consome créditos de IA e tempo; mantém-se o processamento por lotes com travão.
- Referências obtidas por leitura de página continuam a ser a fonte menos fiável; sugestões apoiadas numa só loja ficam sinalizadas.
