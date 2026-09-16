# Preço automático 1% abaixo da concorrência

## Diagnóstico (verificado)

1. **As referências da concorrência não são fiáveis hoje.** Em `supabase/functions/compare-prices/index.ts` a validação por IA usa a variável `workspace_id` dentro de `validateWithAI`, mas essa variável não existe nessa função. Isso lança erro em todas as chamadas, é apanhado pelo `catch` e a função cai sempre no método de recolha por texto (regex). Resultado: o preço "da concorrência" vem de leitura bruta de páginas, sem confirmar que é o mesmo produto.
2. **Consequência visível nos dados.** Na base de dados, dois kits Ajax diferentes têm exactamente o mesmo preço de concorrência (374,03 €) e a mesma origem; há também produtos com referências guardadas mas já expiradas (0 referências vivas), ou seja o campo mostra valores antigos que ninguém revalida.
3. **Existe já onde guardar a regra de margem:** a tabela `product_pricing_rules` tem `min_margin_pct`, `target_margin_pct` e `max_margin_pct` por produto, categoria ou todos. Não é preciso inventar estrutura nova.
4. Os preços dos produtos estão com IVA incluído (`tax_included = true`) e os preços recolhidos das lojas concorrentes também são com IVA — a comparação faz-se na mesma base.

## Decisões (conforme escolhido)

- Ajuste **automático**: quando há referências novas, o sistema recalcula o preço.
- Alvo: **1% abaixo do menor preço válido da concorrência**.
- Se esse valor violar a margem mínima, o sistema **desce só até ao limite da margem mínima** (nunca abaixo) e registra o motivo.
- Contam **todas as referências recolhidas**, incluindo as obtidas por leitura de texto — por isso o filtro de qualidade abaixo é essencial.

## O que vai ser feito

### 1. Corrigir e endurecer a recolha de referências
- Corrigir o erro que desliga a validação por IA (passar o identificador do espaço de trabalho corretamente).
- Descartar referências que a IA não confirme como o mesmo produto e as que estejam fora de um intervalo razoável face ao preço atual.
- Deixar de escrever o preço da concorrência no produto quando não existem referências válidas e vivas; limpar valores expirados em vez de os manter.
- Guardar, por produto, quantas referências sustentam o valor e quando foi recolhido.

### 2. Motor de preço "1% abaixo"
- Função pura nova (`src/lib/pricing/undercutPricing.ts`) que recebe preço atual, menor preço válido da concorrência, custo total e margem mínima e devolve: preço proposto, se foi limitado pela margem, e o motivo.
- Regras: preço proposto = menor concorrente × 0,99, arredondado a 2 decimais; se a margem resultante < margem mínima, usa o preço mínimo que cumpre a margem; se nem isso for possível, não altera e marca "margem insuficiente".
- Nunca altera produtos sem custo conhecido, sem referências válidas, com "preço sob consulta" ou marcados como excluídos do ajuste automático.
- Testes unitários para todos estes casos.

### 3. Aplicação automática segura
- Executada dentro do processo que já monitoriza preços (`auto-price-monitor`), a correr por lotes: número máximo de produtos por execução, bloqueio para evitar execuções sobrepostas, registo por produto do que foi alterado, e paragem automática em caso de falta de crédito de IA ou limite atingido.
- Cada alteração fica no histórico de preços já existente e no registo de auditoria, com preço anterior, preço novo, concorrente usado e origem.
- Interruptor por espaço de trabalho para ligar/desligar o ajuste automático, e possibilidade de excluir produtos individuais.

### 4. Visibilidade no ecrã
- Em Loja online → Inteligência de Preços: colunas com preço da concorrência, número de referências, data da recolha, preço proposto e se ficou limitado pela margem.
- Aviso claro quando o valor da concorrência é antigo ou tem apenas uma referência.
- Em "Comparar Preços" da ficha do produto: indicação de qual referência está a ser usada como base do ajuste.

## Notas técnicas

- Alterações: `supabase/functions/compare-prices/index.ts`, `supabase/functions/auto-price-monitor/index.ts`, novo `src/lib/pricing/undercutPricing.ts` (+ testes), `PricingIntelligenceSection.tsx`, `useStoreAdminProducts.ts`, `PriceComparisonWidget.tsx`.
- Base de dados: colunas adicionais em `products` para contagem/data das referências e exclusão do ajuste automático; tabela de configuração do ajuste por espaço de trabalho. Tudo aditivo, com RLS por `workspace_id` e grants.
- Margem calculada com custo total (custo direto + operacional) e sobre preço sem IVA, seguindo a convenção já usada no projeto.

## Critérios de aceitação

- Nenhum produto fica com preço de concorrência sem referências válidas e vivas.
- Preço aplicado = 1% abaixo do menor concorrente válido, exceto quando a margem mínima o impede — nesse caso fica no limite da margem, nunca abaixo.
- Todas as alterações automáticas ficam registadas e são reversíveis pelo histórico.
- O ajuste automático pode ser desligado por espaço de trabalho e por produto.

## Riscos

- Referências obtidas por leitura de texto continuam a ser a fonte menos fiável; ao incluí-las, existe risco de descidas de preço baseadas em páginas de produto errado. Mitigação: exigir confirmação de correspondência, intervalo de preço e limite de descida por execução.
