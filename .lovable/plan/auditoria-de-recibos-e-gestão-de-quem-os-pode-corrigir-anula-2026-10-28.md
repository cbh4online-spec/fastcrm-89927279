# Auditoria de recibos e gestão de quem os pode corrigir/anular

## 1. Registo de auditoria de recibos
- Cada correção ou anulação fica gravada automaticamente pelo próprio servidor. O registo não depende do ecrã e não pode ser apagado nem editado por utilizadores.
- Guarda: quem fez, quando, se foi correção ou anulação, a fatura, os valores antes e depois e o motivo.
- O motivo passa a ser **obrigatório** ao corrigir e ao anular, com um mínimo de 3 caracteres.
- Na ficha da fatura, por baixo do histórico de pagamentos, aparece uma secção «Alterações a recibos» com data, pessoa, ação, valor antes → depois e motivo. Esta secção é visível para quem pode gerir recibos.

## 2. Ecrã «Quem pode corrigir/anular recibos»
- Nova página em Definições → Faturação → «Permissões de recibos».
- Mostra os membros do espaço de trabalho com o nome, o email, o papel e um interruptor «Pode corrigir/anular recibos».
- O dono e os admins aparecem sempre ativos e bloqueados, porque já têm este acesso pelo papel.
- Ligar ou desligar o interruptor só muda esta permissão. O papel e as restantes permissões ficam como estão.
- Só o dono e os admins abrem esta página e alteram os interruptores. O servidor também o garante.
- Cada vez que se dá ou retira esta permissão, fica registado quem o fez e quando.

## Detalhes técnicos
- Tabela `invoice_payment_audit` (workspace_id, payment_id, invoice_id, action UPDATE/DELETE, actor_id, reason, old_data, new_data, created_at). Tem GRANT SELECT para authenticated e ALL para service_role. A política SELECT exige `has_workspace_capability(..,'finance.manage')`. Não há políticas de INSERT/UPDATE/DELETE para utilizadores.
- Trigger `AFTER UPDATE OR DELETE` em `invoice_payments`, SECURITY DEFINER, que lê o motivo de `current_setting('app.payment_change_reason', true)`.
- RPCs `update_invoice_payment(id, patch, reason)` e `void_invoice_payment(id, reason)`, ambas SECURITY DEFINER. Validam `finance.manage` e o motivo, fazem `set_config` do motivo e depois o UPDATE ou DELETE. Os hooks `useUpdateInvoicePayment`/`useDeleteInvoicePayment` passam a usar estas RPCs e deixam de usar `logChange`.
- Trigger de auditoria em `workspace_member_capability_grants` que escreve em `activity_logs`.
- Página `ReceiptPermissionsPage.tsx`, rota `/dashboard/settings/receipt-permissions`, registada no route manifest, com guard `workspace.manage` e a gestão feita pelo hook `useCapabilityGrantsAdmin`.
- Testes: motivo obrigatório; um agente sem permissão é recusado; o interruptor não altera o papel.

## Critérios de aceitação
- Depois de a Karina anular um recibo com um motivo, a fatura mostra a anulação com o nome dela, a hora e o motivo.
- O dono liga a permissão a outro agente. Esse agente passa a ver as ações sobre os recibos e o papel dele não muda.
- Um agente sem a permissão não consegue abrir o ecrã nem alterar recibos.
