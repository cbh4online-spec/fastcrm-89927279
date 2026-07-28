# SAF-T Junho 2026: comparação com o Excel e correção dos desvios

## Comparação feita (valores reais, não estimados)

Workspace PHARLISS, período 01–30 de junho de 2026.

| Indicador | Excel (SAF-T) | Base de dados | Desvio |
|---|---|---|---|
| Documentos de venda | 205 | 281 | +76 |
| Documentos da importação SAF-T `0525946b` | 205 | 205 | ok |
| Valor líquido (s/ IVA) | 60.296,15 € | 70.013,27 € | +9.717 € |
| Total c/ IVA | 70.012,74 € | 81.964,26 € | +11.951 € |
| Linhas de venda | 1.723 | 1.723 | ok |
| Recibos | 135 (62.302,48 €) | 67 (18.236,28 €) | faltam 68 recibos / 44.066 € |
| Documentos anulados (estado A) | 3 | 3 (`cancelled`) | ok |

## Bugs identificados

### 1. IVA aplicado sobre valores que já tinham IVA (importação de junho)
Nas 205 faturas da importação, o campo `subtotal` ficou com o **total bruto** do documento e o IVA foi somado por cima.
Exemplo `FT V100.02/5232`: Excel líquido 672,04 € + IVA 154,57 € = 826,61 €. Na base: subtotal 826,61 €, IVA 190,12 €, total 1.016,73 €.
A soma dos `subtotal` (70.013,27 €) coincide com o total bruto do Excel (70.012,74 €) — confirma o desalinhamento.
O código atual já tem salvaguarda a partir das linhas, mas esta importação foi feita antes dessa correção: os dados ficaram por reparar.

### 2. 76 faturas duplicadas de uma importação antiga
Existem 76 documentos sem `saft_import_id`, numerados no formato curto (`V100/5232`, `V252/5`), que duplicam documentos do SAF-T (`FT V100.02/5232`). Têm o bruto no `subtotal` e IVA a zero. Somam 31.655 € que estão a inflacionar toda a faturação de junho.

### 3. Metade dos recibos não é importada
No `saft-import`, os pagamentos só são ligados a faturas presentes **no próprio ficheiro** (`invoiceIdByNo`). Os recibos de junho que liquidam faturas de meses anteriores (ex.: `FT V100.02/4349`, já existente na base) são descartados com "fatura não encontrada". Resultado: 67 de 135 recibos importados e conta corrente com dívida fictícia de ~44 mil euros.

## Correções a aplicar

### A. Reparação dos dados existentes (SQL)
1. Eliminar as 76 faturas duplicadas sem `saft_import_id` (e respetivos itens/pagamentos em cascata), após listagem de conferência.
2. Recalcular `subtotal`, `tax_amount` e `total` das faturas da importação `0525946b` a partir das linhas em `invoice_items` (líquido = soma dos líquidos das linhas; IVA = bruto − líquido). Aplicar a mesma verificação a todas as faturas SAF-T do workspace onde `subtotal` coincida com o bruto das linhas.
3. Reimportar os recibos em falta e correr `reconcile_invoice_payments` para atualizar `amount_paid`, `status` e `paid_at`.

### B. Correções de código
1. `supabase/functions/saft-import/index.ts`: resolver as faturas dos pagamentos **contra a base de dados** (consulta por `saft_invoice_no` de todos os documentos referenciados nos recibos), não apenas contra o ficheiro. Só descartar quando a fatura realmente não existe.
2. Reforçar o cálculo de totais: quando as linhas existirem, o líquido/IVA/bruto vêm sempre das linhas; os totais do ficheiro só são usados como fallback, com registo no log quando divergem.
3. Registar no log de importação e mostrar no painel de conferência (`SafTPaymentsReport`) o motivo de cada recibo ignorado, com o número do documento de origem.

### C. Verificação final
Painel de conferência com o mapa acima (documentos, líquido, IVA, bruto, recibos) para o período importado, para comparar diretamente com o ficheiro.

## Critérios de aceitação
- Junho 2026: 205 documentos, líquido 60.296,15 €, bruto 70.012,74 € (69.121,71 € excluindo anulados).
- 135 recibos importados, total recebido 62.302,48 €.
- Zero faturas duplicadas com numeração curta.
- Nenhuma fatura com `subtotal` igual ao bruto.

## Pontos a validar
- Notas de crédito (3 em junho) estão registadas com valor positivo, tal como no Excel; confirmar se devem passar a abater à faturação.
- Documentos `FR` (recibos-fatura) estão a entrar como documentos de venda com `document_type = receipt`; confirmar se devem contar para a faturação do período.
