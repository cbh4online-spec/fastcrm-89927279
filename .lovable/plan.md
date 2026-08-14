# Assistentes IA — evolução para competir com o GHL (Conversation AI)

## Diagnóstico do módulo atual
O módulo (`AIAssistantsModule`) tem 6 separadores: Agentes, Personas, Bases, Fluxos, Widget e Testar IA.
- Agentes: formulário completo com canal, persona, fluxo, bases, autopilot, horário de trabalho (`AgentFullForm`).
- Personas: CRUD, geração por IA e chat de teste.
- Bases de conhecimento: CRUD com RAG.
- Fluxos: builder visual reutilizado.
- Widget: configuração e chat de teste.

O que o GHL tem e aqui falta (verificado no código do módulo):
1. **Sem separador de Desempenho/Analytics** dentro do módulo — existem já as tabelas `bot_analytics`, `ai_analytics_events`, `ai_usage_logs`, `ai_response_audits`, mas nada é mostrado aqui.
2. **Sem regras de escalamento/handoff visíveis** — a tabela `bot_transfer_rules` existe mas não há UI no módulo.
3. **Sem templates/receitas de agente** — no GHL cria-se um bot a partir de casos de uso (qualificação de leads, marcação de reuniões, suporte, recuperação de carrinho). Aqui começa-se sempre do zero.
4. **Sem ações/ferramentas do agente** — o GHL deixa o bot marcar reuniões, mudar etapa do pipeline, adicionar tags. O `AgentFullForm` só guarda definições de resposta.
5. **Sem métricas por agente no cartão** (conversas, taxa de resolução, handoffs) nem estado "a aprender".

## Plano por fases

### Fase 1 — Visibilidade e confiança (maior impacto imediato)
- Novo separador **Desempenho**: conversas geridas, mensagens enviadas, taxa de resolução sem humano, handoffs, custo IA e tempo médio de resposta, com filtro de período (7/30/90 dias) e detalhe por agente.
- Métricas resumidas no cartão de cada agente em `AgentsTab`/`AgentCardExpanded`.
- Lista das últimas conversas do agente com acesso direto à conversa no inbox.

### Fase 2 — Escalamento humano (paridade GHL)
- Secção **Handoff** no formulário do agente, sobre `bot_transfer_rules`: transferir por palavra-chave, por número de mensagens sem resolução, por sentimento negativo, ou por pedido explícito do cliente.
- Escolha do destino (utilizador, equipa ou fila) e mensagem de transição.
- Registo de cada handoff para alimentar as métricas da Fase 1.

### Fase 3 — Ações do agente (o diferenciador)
- Catálogo de ações que o agente pode executar durante a conversa: marcar reunião (calendários já existentes), criar/atualizar lead, mover etapa do pipeline, aplicar tag, criar tarefa, enviar proposta.
- Ativação por agente com confirmação obrigatória opcional antes de executar.
- Log de ações executadas visível no separador Desempenho.

### Fase 4 — Arranque rápido e qualidade
- **Templates de agente** (qualificação de leads, marcação de reuniões, suporte pós-venda, recuperação de carrinho, reativação) que pré-preenchem persona, fluxo, bases e ações.
- **Modo de teste em lote**: correr um conjunto de perguntas contra o agente e comparar respostas antes de publicar.
- Feedback positivo/negativo por resposta (`ai_agent_feedback`) para identificar lacunas nas bases de conhecimento.

## Notas técnicas
- Reutilizar tabelas existentes (`bot_analytics`, `bot_transfer_rules`, `ai_agent_feedback`, `ai_response_audits`); só se cria schema novo para ações do agente e templates, sempre com RLS por `workspace_id` e GRANTs.
- Novos separadores seguem o padrão IX já usado no módulo; nada de alterar o layout global.
- Estados vazios, loading, erro e responsividade mobile em cada novo ecrã.

## Critérios de aceitação (Fase 1, primeira entrega)
- Separador Desempenho com KPIs reais por período e por agente, sem valores fictícios.
- Cartões de agente mostram conversas e handoffs do período escolhido.
- Estados vazios claros quando ainda não há dados; sem erros de consola.

## Por validar
Confirmar se avanço já com a Fase 1 (Desempenho) ou se prefere começar pelo Handoff (Fase 2).
