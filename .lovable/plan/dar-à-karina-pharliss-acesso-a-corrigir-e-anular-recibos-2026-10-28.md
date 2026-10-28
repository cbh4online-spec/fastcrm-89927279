# Dar à Karina (PHARLISS) acesso a corrigir e anular recibos

## Situação atual
- A Karina (karinaalmeida@pharliss.pt) está na PHARLISS com o papel **Agente**, que não inclui dados financeiros.
- Os botões «Corrigir recibo» e «Anular recibo» já existem no histórico de pagamentos da fatura e na lista de recibos, mas não verificam permissões.
- Ao nível da base de dados, qualquer membro da PHARLISS pode hoje alterar ou apagar recibos. Isto é uma falha de segurança.

## O que muda
1. **Permissão individual "Gerir recibos"**: o dono ou um admin pode dá-la a uma pessoa específica sem lhe mudar o papel. A Karina recebe-a já. Continua como Agente em tudo o resto e não passa a ver margens nem custos.
2. **Histórico de pagamentos visível** para a Karina na ficha da fatura.
3. **Corrigir/Anular só para quem pode**: o dono, os admins e quem tem a permissão individual. Os outros veem o histórico sem o menu de ações.
4. **Bloqueio no servidor**: alterar ou apagar recibos passa a exigir a mesma permissão, mesmo que alguém contorne o ecrã.
5. **Registo**: cada correção ou anulação fica guardada com quem a fez, quando e com o motivo. A fatura volta a ser recalculada, como acontece hoje.

## Detalhes técnicos
- Nova tabela `workspace_member_capability_grants (workspace_id, user_id, capability, granted_by, created_at)` com RLS (leitura por membros, escrita só por quem tem `workspace.manage`) e GRANTs.
- Função `has_workspace_capability(uid, ws, cap)` SECURITY DEFINER com search_path=public: devolve true para owner/admin ou quando existe uma permissão individual.
- Políticas UPDATE/DELETE de `invoice_payments` passam a usar `has_workspace_capability(..., 'finance.manage')` em vez de `is_workspace_member`.
- `useCapability` junta as permissões individuais às do papel. A mesma regra fica espelhada em `_shared/capabilities.ts`.
- `InvoicePaymentActions` é envolvido em `CapabilityGuard finance.manage`. `InvoicePaymentsHistory` e a página da fatura passam a mostrar-se a quem tem `finance.view` ou `finance.manage`.
- Inserir a permissão `finance.manage` para a Karina na PHARLISS.
- Testes: a matriz de papéis com a permissão individual (um agente sem permissão não pode, um agente com permissão pode) e a regra no servidor.

## Critérios de aceitação
- A Karina abre uma fatura, vê o histórico e consegue corrigir e anular um recibo.
- Outro agente sem a permissão vê o histórico, se tiver acesso, mas não tem as ações e o servidor recusa as alterações.
- O dono e os admins continuam a conseguir fazer tudo.
