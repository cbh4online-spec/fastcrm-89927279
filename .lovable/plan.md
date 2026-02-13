

# AUDITORIA: CONVERSATIONAL ENGINE

---

## 1) INVENTARIO

### Rotas

| Rota | Componente | Descricao |
|---|---|---|
| `/dashboard/conversational-engine` | `ConversationalEngineModule` | Hub principal: Vibes, Regras, Objetivos |
| `/dashboard/flow-builder` | `FlowBuilderModule` | Flow Builder visual (canvas) |
| `/dashboard/ai-assistants` | `KnowledgeBaseModule` | Personas + KB + Agents (referencia flows) |

### Componentes React

| Componente | Ficheiro |
|---|---|
| `ConversationalEngineModule` | `src/components/conversational-engine/ConversationalEngineModule.tsx` |
| `VibeProfilesTab` | `src/components/conversational-engine/VibeProfilesTab.tsx` |
| `VibeProfileForm` | `src/components/conversational-engine/VibeProfileForm.tsx` |
| `ConversationRulesTab` | `src/components/conversational-engine/ConversationRulesTab.tsx` |
| `ConversationRuleForm` | `src/components/conversational-engine/ConversationRuleForm.tsx` |
| `ConversationObjectivesTab` | `src/components/conversational-engine/ConversationObjectivesTab.tsx` |
| `ConversationObjectiveForm` | `src/components/conversational-engine/ConversationObjectiveForm.tsx` |
| `AutopilotConfigTab` | `src/components/conversational-engine/AutopilotConfigTab.tsx` |
| `FlowBuilderModule` | `src/components/flow-builder/FlowBuilderModule.tsx` |
| `FlowBuilderCanvas` | `src/components/flow-builder/FlowBuilderCanvas.tsx` |
| `FlowStepNode` | `src/components/flow-builder/FlowStepNode.tsx` |
| `StepPropertiesPanel` | `src/components/flow-builder/StepPropertiesPanel.tsx` |
| `FlowList` | `src/components/flow-builder/FlowList.tsx` |
| `CreateFlowDialog` | `src/components/flow-builder/CreateFlowDialog.tsx` |

### Hooks

| Hook | Ficheiro |
|---|---|
| `useVibeProfiles` | `src/hooks/useVibeProfiles.ts` |
| `useConversationRules` | `src/hooks/useConversationRules.ts` |
| `useConversationObjectives` | `src/hooks/useConversationObjectives.ts` |
| `useAutopilotConfig` | `src/hooks/useAutopilotConfig.ts` |
| `useConversationalFlows` | `src/hooks/useConversationalFlows.ts` |
| `useFlowEngine` | `src/hooks/useFlowEngine.ts` |
| `useActiveFlowSession` | `src/hooks/useFlowEngine.ts` |

### Edge Functions

| Funcao | Descricao | Chamada por |
|---|---|---|
| `flow-engine` | Executa fluxos conversacionais step-by-step | `ai-inbox-reply`, `chat-widget`, `useFlowEngine` |
| `ai-inbox-reply` | Gera respostas IA (chama flow-engine primeiro) | `ghl-webhook-message`, inbox UI |
| `chat-widget` | Widget publico (chama flow-engine) | Embed externo |
| `bot-transfer` | Transfere para humano | Regras de handoff |
| `human-handover` | Escalacao para agente | Regras de handoff |
| `calculate-conversation-priority` | Calcula prioridade de conversa | Trigger |

### Tabelas

| Tabela | RLS | Registos | Descricao |
|---|---|---|---|
| `vibe_profiles` | Ativo | 2 | Perfis de tom/estilo IA |
| `conversation_rules` | Ativo | 18 | Regras DO/DONT/STOP/REDIRECT |
| `conversation_objectives` | Ativo | 6 | Objetivos por conversa |
| `conversation_objective_progress` | Ativo | - | Progresso por objetivo |
| `autopilot_config` | Ativo | 2 | Config autopilot legacy |
| `conversational_flows` | Ativo | 2 | Fluxos visuais |
| `flow_steps` | Ativo | - | Passos dos fluxos |
| `flow_variables` | Ativo | - | Variaveis dos fluxos |
| `conversation_sessions` | Ativo | - | Sessoes ativas de fluxo |
| `flow_analytics` | Ativo | - | Metricas por fluxo/dia |
| `conversation_autopilot_state` | Ativo | - | Estado auto/manual por conversa |
| `autopilot_events` | Ativo | - | Log de eventos autopilot |
| `bot_transfer_rules` | Ativo | - | Regras de transferencia |
| `conversation_journey` | Ativo | - | Jornada da conversa |
| `conversation_replays` | Ativo | - | Replays de conversa |

### Triggers

Apenas `update_updated_at_column` em: `conversation_rules`, `vibe_profiles`, `conversation_objectives`, `conversation_objective_progress`, `conversational_flows`, `flow_steps`, `conversation_sessions`, `autopilot_config`, `conversation_autopilot_state`.

**Nenhum trigger de validacao ou negocio.**

---

## 2) FLUXO FUNCIONAL

| Fluxo | Estado | Notas |
|---|---|---|
| Criacao de flow visual | Existe | CRUD completo em `useConversationalFlows` |
| Criacao de steps/variaveis | Existe | Drag & drop no canvas |
| Execucao de flow (flow-engine) | **QUEBRADO** | Nomes de colunas errados (ver P0-1, P0-2) |
| Criacao de sessao | **QUEBRADO** | Escreve `state` e `collected_variables` que nao existem na DB |
| Vibe profiles CRUD | Existe | Funcional |
| Conversation rules CRUD | Existe | Funcional, com toggle ativo/inativo |
| Objectives CRUD + reorder | Existe | Funcional |
| Autopilot config | Existe | Legacy, superseded por `ai_agents` |
| Regras injetadas no prompt IA | Parcial | `ai-inbox-reply` busca regras mas nao todas |
| Vibe injetado no prompt IA | Parcial | Depende de persona ter vibe_profile_id |
| Objectives tracking (progresso) | Parcial | Tabela existe, sem UI de progresso |
| Bot transfer / handoff | Existe | Edge functions existem |

---

## 3) MULTI-TENANT

| Tabela | workspace_id? | RLS SELECT | RLS INSERT | RLS UPDATE | RLS DELETE | Risco |
|---|---|---|---|---|---|---|
| `vibe_profiles` | Sim | workspace_members | workspace_members (ALL) | workspace_members (ALL) | workspace_members (ALL) | OK |
| `conversation_rules` | Sim | workspace_members | admin/owner (ALL) | admin/owner (ALL) | admin/owner (ALL) | OK |
| `conversation_objectives` | Sim | workspace_members | admin/owner (ALL) | admin/owner (ALL) | admin/owner (ALL) | OK |
| `autopilot_config` | Sim | workspace_members | admin/owner (ALL) | admin/owner (ALL) | admin/owner (ALL) | OK |
| `conversational_flows` | Sim | workspace_members | WITH_CHECK **ausente** | workspace_members | workspace_members | **P1: INSERT sem WITH_CHECK de workspace** |
| `flow_steps` | Nao (via flow_id) | via flow JOIN | via flow JOIN (ALL) | via flow JOIN (ALL) | via flow JOIN (ALL) | OK (indireto) |
| `flow_variables` | Nao (via flow_id) | via flow JOIN | via flow JOIN (ALL) | via flow JOIN (ALL) | via flow JOIN (ALL) | OK (indireto) |
| `conversation_sessions` | Sim | workspace_members | workspace_members (ALL) | workspace_members (ALL) | workspace_members (ALL) | OK |
| `flow_analytics` | Sim | workspace_members | workspace_members (ALL) | workspace_members (ALL) | workspace_members (ALL) | OK |
| `conversation_autopilot_state` | Sim | workspace_members | **USING(true)** | **USING(true)** | **USING(true)** | **P0: qualquer user autenticado pode manipular** |
| `autopilot_events` | Sim | workspace_members | **WITH_CHECK(true)** | - | - | **P1: qualquer user pode inserir eventos** |
| `conversation_journey` | Sim | workspace_members | **USING(true)** | **USING(true)** | **USING(true)** | **P1: sem filtro workspace** |
| `conversation_replays` | Sim | workspace_members | - | - | - | Sem INSERT/UPDATE/DELETE (read-only) |

---

## 4) EDGE FUNCTIONS

### `flow-engine`
- **Input**: `{ action, workspaceId, conversationId, leadId, userMessage, channel }`
- **Output**: `{ hasActiveFlow, flowId, sessionId, responses[], sessionState, collectedVariables, personaId, knowledgeBaseIds }`
- **Auth**: Bearer token required, mas usa `SERVICE_ROLE_KEY` internamente
- **Erros tratados**: Try/catch geral, 401/400/500
- **Timeout**: Default Deno (sem custom)
- **Retries**: Nenhum
- **BUGS CRITICOS**: Ver P0-1, P0-2, P0-3

### `ai-inbox-reply`
- Chama `flow-engine` internamente via fetch
- Se flow ativo, usa respostas do flow em vez de gerar com IA

### `chat-widget`
- Chama `flow-engine` para conversas do widget
- Fallback para KB RAG se sem flow ativo

---

## 5) TESTES

| ID | Caso | Pre-condicoes | Passos | Esperado | Atual |
|---|---|---|---|---|---|
| T01 | Receber mensagem com flow ativo | Flow `active`, entry_point definido | Mensagem inbound chega | Sessao criada, resposta do step enviada | **FALHA: flow-engine escreve `state`/`collected_variables` que nao existem** |
| T02 | Enviar mensagem manual | Thread aberta no inbox | User escreve e envia | Mensagem gravada, thread atualizada | Funciona (via canal especifico) |
| T03 | Mudar status conversa | Thread no inbox | Clicar open/pending/closed | Status atualizado | Funciona |
| T04 | Gerar AI draft | Thread com mensagens | Clicar "Sugerir resposta" | Draft gerado com regras/vibe aplicados | Parcial (depende de config) |
| T05 | Escalar para humano | Flow com step handoff | Flow chega ao step handoff | `conversation_autopilot_state` atualizado, agente notificado | **FALHA: state/status mismatch** |
| T06 | Erro de envio (canal indisponivel) | Canal IG desconectado | Tentar enviar | Toast de erro, mensagem nao enviada | Depende de edge function do canal |
| T07 | Webhook duplicado | Mesma msg recebida 2x | Dois webhooks em <1s | Apenas 1 msg gravada | **SEM DEDUP: nao ha idempotency key** |
| T08 | Thread sem contacto/lead | Webhook de canal novo | Msg de numero desconhecido | Lead criado automaticamente | Existe (auto-lead creation no webhook) |
| T09 | Mensagem sem canal valido | Flow engine chamado sem channel | `channel` undefined | Seleciona flow generico | Funciona (channel e opcional) |
| T10 | Falha de auth no flow-engine | Token expirado | Chamar flow-engine | 401 Unauthorized | Funciona |

---

## 6) BUGS

### P0 (Bloqueante)

| # | Titulo | Causa | Impacto | Correcao |
|---|---|---|---|---|
| P0-1 | **flow-engine usa `state` mas DB tem `status`** | `flow-engine/index.ts` linhas 109, 43, 362 usam `.eq("state", "active")` e `state: "active"` mas a coluna e `status` | **Flow engine nunca encontra sessoes existentes, cria duplicadas, nunca atualiza estado** | Substituir `state` por `status` em todo o ficheiro |
| P0-2 | **flow-engine usa `collected_variables` mas DB tem `variables`** | `flow-engine/index.ts` linhas 133, 312, 358 usam `collected_variables` mas a coluna e `variables` | **Variaveis coletadas nunca sao gravadas nem lidas** | Substituir `collected_variables` por `variables` |
| P0-3 | **flow-engine usa `last_interaction_at` que nao existe** | Linha 363: `last_interaction_at: new Date().toISOString()` | **Update de sessao falha silenciosamente (service_role ignora erro?)** | Remover campo ou adicionar coluna |
| P0-4 | **useActiveFlowSession usa `state` e `collected_variables`** | `useFlowEngine.ts` linhas 76, 77, 102 | **Hook nunca encontra sessoes ativas** | Corrigir para `status` e `variables` |
| P0-5 | **conversation_autopilot_state RLS: USING(true) para ALL** | Qualquer user autenticado pode INSERT/UPDATE/DELETE em qualquer workspace | **Fuga de dados cross-tenant, manipulacao de estado autopilot** | Restringir para workspace_members |

### P1 (Grave)

| # | Titulo | Causa | Correcao |
|---|---|---|---|
| P1-1 | **conversational_flows INSERT sem WITH_CHECK** | Policy INSERT nao tem `WITH_CHECK` de workspace | Adicionar `WITH CHECK (workspace_id IN (SELECT ... workspace_members))` |
| P1-2 | **autopilot_events INSERT WITH_CHECK(true)** | Qualquer user pode inserir eventos em qualquer workspace | Restringir para workspace_members |
| P1-3 | **conversation_journey ALL USING(true)** | Sem filtro workspace | Restringir |
| P1-4 | **Autopilot tab removido do UI mas hook mantido** | `AutopilotConfigTab` existe mas nao aparece nas tabs (grid-cols-3 sem autopilot) | Codigo morto. Remover ou re-adicionar |
| P1-5 | **flow_steps nao tem campo `variable_to_collect`** | Flow engine usa `step.variable_to_collect` mas DB tem `variable_id` (UUID ref) | Flow engine nao consegue extrair variaveis de questions |
| P1-6 | **Sem webhook dedup** | Mesma mensagem processada N vezes | Adicionar idempotency key ou dedup window |
| P1-7 | **flow_analytics upsert pode falhar** | `onConflict: "flow_id,date"` assume unique constraint que pode nao existir | Verificar e criar constraint |

### P2 (Melhoria)

| # | Titulo |
|---|---|
| P2-1 | Sem UI de progresso de objectives (tabela existe, UI nao) |
| P2-2 | Reorder de objectives faz N queries sequenciais (deveria ser batch) |
| P2-3 | `setDefault` em vibe_profiles nao e atomico (2 queries separadas) |
| P2-4 | Flow builder sem validacao de fluxo antes de ativar (pode ativar sem entry_point) |
| P2-5 | Sem metricas visuais de flow analytics |
| P2-6 | Sem teste de flow antes de ativar (modo "dry run") |

---

## 7) GAPS PARA PRODUCAO

### Producao Estavel

| Gap | Estado |
|---|---|
| Flow engine funcional (corrigir P0-1 a P0-5) | **Bloqueante** |
| RLS restritivo em todas as tabelas | **Bloqueante** |
| Dedup de webhooks | Alto |
| Validacao de flow antes de ativar | Medio |
| Logs estruturados de execucao de flows | Medio |

### Escala

| Gap | Estado |
|---|---|
| Paginacao de sessoes | Medio |
| Flow analytics pre-calculados | Medio |
| Timeout configuravel por flow (existe campo, sem enforcement) | Medio |
| Rate limiting no flow-engine | Alto |

### IA Semi-Autonoma

| Gap | Estado |
|---|---|
| Objectives tracking end-to-end (UI + engine) | Alto |
| Vibe injection consistente no prompt | Medio |
| Conversation rules avaliadas runtime no flow-engine | Alto (regras existem mas flow-engine nao as consulta) |
| A/B testing de message_variants nos steps | Baixo |
| Auto-fallback quando flow falha (atualmente silencioso) | Alto |

---

## PLANO DE CORRECAO (Priorizado)

### Imediato (P0)

1. **Corrigir flow-engine**: `state` -> `status`, `collected_variables` -> `variables`, remover `last_interaction_at`, `variable_to_collect` -> logica com `variable_id`
2. **Corrigir useFlowEngine.ts**: mesmas correcoes de nomes
3. **Restringir RLS** em `conversation_autopilot_state`: substituir `USING(true)` por workspace_members check

### Semana 1 (P1)

4. Corrigir INSERT policy de `conversational_flows` (adicionar WITH_CHECK)
5. Corrigir INSERT policy de `autopilot_events`
6. Corrigir ALL policy de `conversation_journey`
7. Verificar/criar unique constraint `(flow_id, date)` em `flow_analytics`
8. Limpar codigo morto do `AutopilotConfigTab` ou re-integrar

### Semana 2 (P2 + Gaps)

9. UI de progresso de objectives
10. Validacao de flow antes de ativar (entry_point obrigatorio)
11. Injecao de conversation_rules no flow-engine
12. Logs de execucao por sessao

