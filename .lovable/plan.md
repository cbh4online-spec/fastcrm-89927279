# Etapa 4 — Objetivos unificados no Crescimento

## Diagnóstico
Hoje existem vários sistemas de metas separados: objetivos de negócio, metas de vendas, metas de desempenho, metas de produtividade e objetivos de conversa. Cada um tem o seu ecrã e calcula o progresso à sua maneira. O sistema de objetivos de negócio, o mais completo, não tem nenhum registo. As metas de vendas e as de desempenho têm um registo cada.

O Crescimento já calcula valores reais no servidor (Etapa 2). Falta ligar as metas a esses mesmos valores, para que a meta e o resultado nunca divirjam.

## Decisões de produto
- No Crescimento, um objetivo é sempre um indicador do catálogo com um valor-alvo e um período (mês, trimestre ou ano). Exemplo: «Faturação ≥ 80 000 € em Novembro de 2026».
- O progresso real é calculado no servidor com a mesma função dos cartões. Ninguém o introduz à mão.
- Nesta fase os objetivos são da organização. Metas por pessoa ou por vendedor ficam para depois.
- Só gestores criam, editam ou arquivam objetivos; os membros apenas os veem. Os objetivos são arquivados, nunca apagados.
- Os sistemas antigos não são alterados nem apagados nesta etapa. Ficam marcados como legado, e a sua migração só se fará quando decidir.
- Só se aceitam indicadores já calculáveis; os «Em breve» não podem ter objetivo.

## O que o utilizador vê
- Em Crescimento, uma secção «Objetivos» com a lista dos objetivos do período escolhido. Cada objetivo mostra:
  - o valor atual, o alvo e a percentagem atingida;
  - a projeção para o fim do período, calculada em ritmo linear e em dias de calendário de Lisboa;
  - o estado: Atingido, No caminho, Em risco ou Atrasado.
- Nos cartões de indicador com objetivo aparece uma pequena barra de progresso.
- Gestores: botão «Novo objetivo», que abre um formulário (indicador, período, alvo e nota opcional), e ainda editar e arquivar.
- Estados previstos: sem objetivos (com convite a criar o primeiro), a carregar, erro e objetivo duplicado (não se permite outro igual para o mesmo indicador e período).

## Detalhes técnicos
- Migração: nova tabela `bgi_objectives`, com:
  - colunas `id`, `workspace_id`, `indicator_id`, `period_type` (month/quarter/year), `period_start` (date), `target_value numeric > 0`, `direction` ('gte'|'lte', por omissão gte), `notes` (até 500 caracteres), `archived_at`, `created_by`, `updated_by` e datas de criação e alteração;
  - unicidade parcial em (workspace, indicador, período, início) enquanto não estiver arquivado;
  - GRANT a authenticated e a service_role;
  - RLS de leitura para membros (padrão `get_user_workspace_ids`) e escrita só para `can_manage_workspace` e super admin;
  - trigger que valida `indicator_id` (lista de indicadores suportados) e alinha `period_start` ao início do período;
  - trigger de auditoria.
- Nova RPC `bgi_objectives_progress(_workspace_id, _period, _anchor)`, SECURITY DEFINER e `search_path=public`: verifica a pertença ao workspace e o módulo (fail-closed), reutiliza `bgi_compute_indicators` e devolve cada objetivo com o valor atual.
- `src/lib/bgi/objectiveProgress.ts`: funções puras para percentagem, projeção linear, estado e dias decorridos/totais em Lisboa (`lisbonDays.ts`), com testes.
- `useBgiObjectives` para a lista e as alterações; zod no formulário.
- `BgiObjectivesSection.tsx` e `BgiObjectiveDialog.tsx`; barra de progresso em `BgiKpiGrid`.
- `COMMENT ON TABLE` a marcar `business_objectives`, `objective_metrics`, `objective_plans` e `sales_goals` como legado.
- Regra no `AGENTS.md`: os objetivos de crescimento vivem só em `bgi_objectives` e o progresso só vem da RPC e de `objectiveProgress.ts`.

## Critérios de aceitação
- Um gestor cria «Faturação ≥ X» para o mês corrente e vê o valor real igual ao do cartão, com a percentagem e o estado certos.
- Um membro vê os objetivos mas não consegue criá-los, nem pelo ecrã nem por escrita direta.
- Não é possível criar um duplicado ativo nem usar um indicador «Em breve».
- Os testes de `objectiveProgress` passam, o build fica OK e o ecrã é verificado no telemóvel.

## Riscos e pontos por validar
- Os outros ecrãs de metas continuam a existir até decidir migrá-los ou retirá-los.
- A projeção linear é simples; em negócios com sazonalidade pode enganar. A previsão melhor fica para a etapa de IA.
