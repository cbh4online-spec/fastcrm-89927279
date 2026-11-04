# Etapa 5 — Growth Intelligence com IA

## Diagnóstico
O Crescimento já mostra valores reais (Etapa 2), um painel configurável (Etapa 3) e objetivos com projeção (Etapa 4). Falta a leitura executiva: o que mudou, porquê e o que fazer a seguir.

A aplicação já tem controlo de custos de IA por plano (`aiGate`), limites por organização (`checkAIBudget`) e registo de uso (`logAIUsage`). A IA deve reutilizar estas peças em vez de criar novas.

## Decisões de produto
- A IA nunca calcula números. Recebe apenas os valores já calculados pelo servidor: indicadores do período, período anterior, ano anterior e objetivos com o seu estado. A partir daí escreve a análise.
- A análise só é gerada a pedido: botão «Gerar análise». Não há execução automática, logo não há custo inesperado.
- Fica guardada uma análise por organização e por período. Quem abre o ecrã vê a guardada, sem novo custo. Gerar de novo está limitado a 3 vezes por dia por organização.
- Só gestores geram análises; os membros leem a última guardada.
- Conteúdo fixo, sempre com estas partes:
  1. Resumo (3–5 frases);
  2. Destaques positivos;
  3. Alertas;
  4. Objetivos em risco, com o motivo provável;
  5. Até 5 ações recomendadas, cada uma ligada a um indicador.
- Cada afirmação indica o indicador em que se baseia. Indicadores «Sem dados» ou «Em breve» nunca são usados.
- Se a IA falhar, o plano não o permitir ou o limite for atingido, aparece uma mensagem clara e a análise anterior mantém-se visível.

## O que o utilizador vê
- Em Crescimento, um cartão «Análise IA» acima dos objetivos, com a data em que foi gerado, o período e o nome de quem o gerou.
- O botão «Gerar análise» ou «Atualizar análise» indica quantas gerações restam hoje.
- Estados previstos: sem análise (convite a gerar), a gerar, erro, limite atingido e plano sem IA.
- Aviso discreto: «Gerado por IA a partir dos indicadores do período; confirme antes de decidir.»

## Detalhes técnicos
- Migração: tabela `bgi_ai_insights`, com:
  - colunas `id`, `workspace_id`, `period_type`, `period_start`, `content jsonb`, `input_hash`, `model`, `created_by` e `created_at`;
  - índice por (workspace, período, início, created_at desc);
  - GRANT de leitura a authenticated e acesso total a service_role;
  - RLS: leitura para membros (padrão `get_user_workspace_ids`) e escrita só pelo servidor (service_role).
- Nova função `bgi-insights`:
  - CORS e OPTIONS;
  - validação do JWT, de pertença ao workspace e do papel de gestor (`can_manage_workspace` ou super admin);
  - verificação do módulo `growth-intelligence` (fail-closed);
  - `aiGate` (tier medium), `checkAIBudget` e limite de 3 gerações por dia em Lisboa, contado na própria tabela;
  - lê os valores com `bgi_compute_indicators` e os objetivos ativos (com o cliente do utilizador, para respeitar o RLS);
  - chama Lovable AI (`google/gemini-3-flash-preview`) com saída estruturada via tool calling e um schema validado por zod;
  - descarta referências a indicadores inexistentes ou sem dados;
  - `logAIUsage` com `workspaceId`; trata os erros 429 e 402 com mensagens próprias; devolve 200 com `fallback` em caso de erro interno, segundo o padrão do projeto.
- `src/lib/bgi/insightsPayload.ts`: monta o resumo enviado à IA, só com números e nomes (sem dados de clientes), e calcula o `input_hash`. Tem testes.
- `src/lib/bgi/insightsSchema.ts`: schema partilhado da resposta, com testes de validação.
- `useBgiInsights` e o componente `BgiInsightsCard.tsx`.
- Regra no `AGENTS.md`: as análises de IA são só geradas por `bgi-insights` sobre valores do servidor, guardadas em `bgi_ai_insights` e limitadas por `aiGate` e pelo limite diário.

## Critérios de aceitação
- Um gestor gera a análise do mês; os números citados coincidem com os cartões e todas as afirmações apontam para um indicador existente.
- Um membro vê a análise mas não tem o botão, e um pedido direto à função é recusado.
- A 4.ª geração no mesmo dia é recusada com mensagem clara.
- Uma organização sem IA no plano vê o motivo e não é feito nenhum pedido à IA.
- Nenhum dado pessoal de clientes é enviado à IA.
- Os testes de payload e schema passam, o build fica OK e a função é testada com um pedido real.

## Riscos e pontos por validar
- O custo por análise depende do plano: no plano Free a IA fica bloqueada pelo `aiGate`. É preciso confirmar se o módulo pago deve incluir IA mesmo nesse plano.
- A qualidade das recomendações depende dos dados existentes. Com poucos indicadores, a análise será curta.
