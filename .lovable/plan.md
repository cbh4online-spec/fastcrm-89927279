# Conta corrente: recibos do SAF-T já existem mas não estão refletidos nas faturas

## Diagnóstico (valores reais consultados, não estimados)

Sim, o SAF-T traz pagamentos e eles **já foram importados**. O problema é que a maioria não foi refletida na fatura (`amount_paid` / `status`), pelo que a conta corrente aparece em dívida indevidamente.

Workspace PHARLISS, apuramento direto na base de dados:

- 7 importações SAF-T, todas com `import_payments: true`; recibos declarados nas estatísticas: 198 + 235 + 1.308 + 1.116 + 982 + 1.369.
- `invoice_payments` com origem SAF-T: **4.708 registos** (4.076 ligados a faturas deste workspace).
- Faturas não anuladas: 5.763. Com recibos associados: **3.733**.
- Soma dos recibos: **1.126.136,25 €**. Soma da coluna `amount_paid` das faturas: **268.281,94 €**.
- **2.925 faturas têm recibos mas continuam com `amount_paid = 0`.**
- **805 faturas** têm recibos que igualam ou superam o total e mesmo assim não estão com estado `paid`.
- Por estado: `sent` — 4.921 faturas, 1.779.051,28 € brutos, com 882.808,06 € de recibos já registados e `amount_paid` agregado de **-853,37 €** (valor negativo, anomalia).
- 18 faturas têm recibos acima do total (2 em `paid`, 16 em `sent`) — a validar caso a caso.

Ou seja: o cruzamento com a conta corrente é possível e os dados existem; falta a sincronização fatura ↔ recibos.

## O que fazer

### 1. Função de reconciliação na base de dados
Criar `reconcile_invoice_payments(_workspace_id, _invoice_ids default null)` que, por fatura não anulada:
- soma os recibos em `invoice_payments`;
- escreve esse valor em `amount_paid`;
- recalcula `status`: `paid` quando pago ≥ total (tolerância 0,01 €), `partially_paid` quando 0 < pago < total, e mantém `sent` quando pago = 0;
- nunca mexe em faturas `cancelled` nem em `draft`;
- devolve contagem de faturas atualizadas e lista das que ficam com pagamento acima do total.

Executar uma vez para regularizar as 2.925 faturas em atraso.

### 2. Manter sincronizado daqui para a frente
- Trigger em `invoice_payments` (insert/update/delete) a chamar a mesma lógica para a fatura afetada, para que registos manuais e futuros SAF-T fiquem sempre coerentes.
- No `saft-import`, no fim de cada lote, chamar a reconciliação em vez de depender do cálculo atual (que está a falhar em parte dos casos).

### 3. Relatório de conferência no ecrã de importação SAF-T
Painel após a importação com: recibos lidos, recibos criados, ignorados por duplicado, ignorados por fatura inexistente/anulada e pagamentos acima do total. Assim é possível conferir contra o ficheiro sem adivinhar.

### 4. Anomalias a tratar explicitamente
- `amount_paid` negativo (agregado -853,37 € nas faturas `sent`): identificar as linhas e corrigir; a reconciliação recalcula a partir dos recibos, o que resolve, mas fica registo do que foi alterado.
- 18 faturas com pagamento superior ao total: listar em vez de forçar; podem ser notas de crédito ou recibos de vários documentos mal repartidos.

## Notas técnicas
- Um recibo SAF-T pode liquidar várias faturas; o parser já achata em uma linha por documento liquidado (`mapPayment` em `_shared/saft-stream-parser.ts`), pelo que a soma por `invoice_id` é a base correta.
- Dedupe mantém-se por `(invoice_id, saft_payment_ref)`.
- Convenção do projeto respeitada: faturação apresentada líquida (`subtotal`); pago/pendente comparados em bruto (`total` vs `amount_paid`).

## Critérios de aceitação
- Zero faturas com recibos e `amount_paid = 0`.
- Soma de `amount_paid` igual à soma dos recibos (exceto casos listados como excedentes).
- Nenhuma fatura com recibos ≥ total fora do estado `paid`.
- Sem `amount_paid` negativo.
- Detalhe da empresa e listagem de empresas passam a mostrar o mesmo valor pago/pendente.

## Riscos por validar
- Se parte dos recibos do SAF-T forem adiantamentos ou recibos de conta corrente global (não por fatura), a repartição pode ficar imperfeita — os 18 casos de excedente vão indicar se isto acontece.
- Faturas anuladas com recibos associados ficam de fora por decisão; confirmar se é o comportamento pretendido.
