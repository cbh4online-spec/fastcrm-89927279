# Visão Global continua lenta — causa real e correção

## Diagnóstico (confirmado na base de dados)

A otimização anterior mexeu na forma como o ecrã pede os dados, mas o atraso principal está noutro sítio: na **verificação de acesso** que a base de dados faz a cada linha.

- A PHARLISS tem 6.322 faturas (cerca de 3 MB, pouco volume).
- Ler essas faturas sem a verificação de acesso demora **13 ms**.
- Ler as mesmas faturas com a regra de acesso atual demora **4.640 ms** (cerca de 0,7 ms por fatura).
- Com a mesma regra escrita de outra forma, que confirma o acesso **uma só vez por pedido** e não fatura a fatura, demora **10 ms**. Mantém exatamente o mesmo resultado: membro do espaço de trabalho ou super administrador.

A regra atual chama a função de pertença ao espaço de trabalho uma vez por linha. Essa função faz duas verificações de super administrador e uma pesquisa que não usa índice. São 518 regras em todo o sistema com este padrão. Isto explica também outras lentidões vistas no servidor, por exemplo a lista de leads (média de 462 ms, picos de 8 s) e as conversas.

Problema extra encontrado no ecrã: os cartões «Documentos», «Faturado (mês)», «Top clientes» e «IVA por taxa» usam uma lista de faturas que o servidor corta nas 1.000 mais recentes. A PHARLISS tem 6.322, por isso estes valores podem estar incompletos. O primeiro passo da implementação é confirmar isto.

## O que vai mudar

1. **Regras de acesso mais rápidas nas tabelas mais usadas**, com o mesmo resultado em quem vê o quê:
   faturas, itens de fatura, pagamentos, empresas, contactos, leads, oportunidades, conversas, mensagens, atividades CRM, casos de cobrança e tarefas.
   A nova forma: `workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin())`.
2. **Função de pertença otimizada** para as restantes ~500 regras: uma única verificação de super administrador e pesquisas que usam índice, com a mesma lógica (incluindo a ordem de argumentos invertida que já é aceite hoje).
3. **Visão Global sem lista cortada**: os cartões passam a usar os dados completos já carregados por páginas (`useWorkspaceFinancials`), e deixa de haver o pedido pesado de todas as colunas com empresas, contactos e leads associados.

## Detalhes técnicos

- Migração nova: `ALTER POLICY` nas tabelas da lista; `CREATE OR REPLACE FUNCTION is_workspace_member` com `EXISTS` separados (user→ws e ws→user, para a compatibilidade invertida) e `is_super_admin` avaliado uma vez. Mantém `SECURITY DEFINER`, `STABLE`, `search_path=public`. Sem alterações a dados nem a grants.
- `get_user_workspace_ids()` já existe (SECURITY DEFINER, `auth.uid()`). Passa a ser chamada como subconsulta, por isso é avaliada uma vez por pedido.
- `IXDashboard.tsx`: substituir `useInvoices()`/`useInvoiceStats()` por agregados de `useWorkspaceFinancials` (acrescentar `tax_rate`, `rental_contract_id`, `created_at` à seleção paginada). Só se o corte nas 1.000 se confirmar.
- Medição antes/depois com `EXPLAIN ANALYZE` sob as condições reais de acesso, e nova leitura das consultas lentas.

## Critérios de aceitação

- A leitura das faturas da PHARLISS com verificação de acesso desce de ~4,6 s para menos de 100 ms.
- A Visão Global abre em menos de 2 s com a sessão real.
- A Karina (utilizadora normal) continua a ver só a PHARLISS. Um utilizador de outro espaço de trabalho não vê nada da PHARLISS. O super administrador continua a ver tudo.
- «Documentos» mostra 6.322 (ou o total real) e os outros cartões coincidem com os totais por ano já validados.

## Riscos e pontos por validar

- Mudar regras de acesso é sensível. A mudança mantém a lógica e é testada com três perfis (membro, não membro, super admin) antes de dar como concluída.
- Só para utilizadores com muitos espaços de trabalho, a lista de espaços é calculada uma vez por pedido. É barato (21 pertenças no sistema).
- As restantes ~500 regras ficam mais rápidas pela função otimizada, mas continuam a verificar linha a linha. Podem ser migradas por fases se surgirem outros ecrãs lentos.
- Depois de aplicado, é preciso publicar para chegar ao site oficial.
