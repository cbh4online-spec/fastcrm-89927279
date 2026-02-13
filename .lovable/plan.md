
# AUDITORIA TECNICA E FUNCIONAL COMPLETA - FastCRM

---

## 1) INVENTARIO DE FUNCIONALIDADES

### Escala do Sistema
- **424 tabelas** no schema public
- **1233 RLS policies** (SELECT: 462, INSERT: 260, UPDATE: 181, DELETE: 130, ALL: 200)
- **269 funcoes DB** (RPC)
- **~180 Edge Functions** deployadas
- **~120 rotas** no frontend
- **~300+ componentes**
- **~260 hooks** custom
- **50 triggers** em tabelas publicas
- **39 tabelas de logs/eventos/auditoria**

---

### A) AUTH & WORKSPACES

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Login (email/password) | Existe | `/login` | `supabase.auth.signInWithPassword` | Funcional |
| Registo (email/password) | Existe | `/signup` | `supabase.auth.signUp` com `full_name` | Email redirect configurado |
| Reset password | Parcial | Nao ha rota dedicada `/forgot-password` | Auth nativo | Falta UI dedicada para reset no CRM |
| Auth unificado (legacy) | Existe | `/auth` | Verifica workspaces apos login | Toggle login/signup |
| Onboarding | Existe | `/onboarding` | `create_workspace_with_owner` RPC | Cria workspace + owner atomicamente |
| Workspace creation | Existe | WorkspaceContext | RPC `create_workspace_with_owner` | SECURITY DEFINER, atomico |
| Workspace selection | Existe | `WorkspaceSwitcher` no Sidebar | localStorage + DB | Persiste selecao |
| Workspace roles | Existe | owner/admin/agent/viewer/agency | `workspace_members.role` | 5 roles distintos |
| Super Admin | Existe | `/super-admin` | `user_roles` + `is_super_admin` RPC | Tabela separada, correto |
| Agency management | Existe | WorkspaceContext | `managed_by_workspace_id` | SA ve todos, agency ve geridos |
| Menu permissions | Existe | `useMenuPermissions` hook | `menu_permissions` tabela | Filtra sidebar por role |
| RLS workspace isolation | Existe | Todas as tabelas CRM | `workspace_id` em policies | Verificar cobertura completa |

### B) CONTACTOS

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Lista contactos | Existe | `/dashboard/contacts` | `contacts` tabela | Com filtros |
| Detalhe contacto | Existe | `/dashboard/contacts/:id` | Join com custom fields | Timeline |
| Criar/editar/apagar | Existe | Dialog forms | CRUD com RLS | Validado |
| Tags | Existe | `useAutoTags` + `useSmartContacts` | `contacts.tags` (array) | AI auto-tagging disponivel |
| Campos custom | Existe | `useCustomFields` | `custom_fields` + `custom_field_values` | Audit logs incluidos |
| Pesquisa/filtros | Existe | `useEntitySearch` | ILIKE queries | Sem full-text search nativo |
| Import/export | Existe | `/dashboard/imports` | `useImportHistory`, CSV/XLSX | Via papaparse/xlsx |
| Historico/timeline | Existe | `ContactDetail` | `entity_activities`, `crm_activities` | Atividades registadas |
| Duplicados | Existe | `useContactDuplicates`, `useContactMerge` | Detecao + merge | Funcionalidade avancada |
| Enriquecimento | Existe | `useContactEnrichment` | `contact-enrich` edge function | LinkedIn data disponivel |
| Documentos | Parcial | `contact_documents` tabela | Storage | Sem UI dedicada visivel |

### C) INBOX / CONVERSAS

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Lista threads | Existe | `/dashboard/inbox` | `conversations` tabela | Multi-canal |
| Mensagens por thread | Existe | InboxView | `messages` tabela | Realtime possivel |
| Canais: Instagram | Existe | Instagram DMs | `instagram-webhook`, `instagram-send-message` | OAuth flow completo |
| Canais: WhatsApp | Existe | WhatsApp Business | `whatsapp-webhook`, `whatsapp-send-message` | OAuth flow completo |
| Canais: Email | Existe | Email integration | `email-fetch`, `email-send` | Zoho + generic |
| Canais: Chat Widget | Existe | Widget embed | `chat-widget` edge function | `widget_conversations` |
| Estados (open/pending/closed) | Existe | `conversations.status` | Com filtros | Classificacao IA disponivel |
| Atribuicao | Existe | `conversations.assigned_to` | Assign to team member | |
| Nao lidas | Existe | `conversations.unread_count` | Atualizado por triggers | |
| Envio de mensagem | Existe | Per-channel send functions | `instagram-send-message`, `whatsapp-send-message`, `email-send` | |
| Upload/anexos | Parcial | Storage buckets existem | Supabase Storage | Limitado por canal |
| Classificacao IA | Existe | `useConversationClassification` | `classify-conversation` | Categoriza automaticamente |
| Prioridade conversa | Existe | `calculate-conversation-priority` | Trigger + edge function | Score calculado |
| Sumario conversa | Existe | `useConversationSummary` | `conversation-summary` | Resumo IA |
| Regras de fallback | Parcial | `bot_transfer_rules` | `bot-transfer`, `human-handover` | Transferencia para humano |
| Smart alerts | Existe | `inbox_smart_alerts` | Alertas configurados | |

### D) AI EMPLOYEE (IA do FastCRM)

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Sugestao de resposta (copilot) | Existe | Inbox panel | `ai-inbox-reply` + `ai-copilot` | Dual system |
| AI Personas | Existe | `/dashboard/ai-assistants` | `ai_personas` tabela | System prompts custom |
| AI Agents (por canal) | Existe | AI Assistants | `ai_agents` tabela | Autopilot per-channel |
| Autopilot (auto-reply) | Existe | `autopilot_config` + `ai_agents` | `ghl-webhook-message` | **Corrigido recentemente: prioridade agents > legacy** |
| Goal Config | Existe | `ai_agents.goal_config` | Injected no system prompt | **Corrigido: goals agora passados ao ai-inbox-reply** |
| Knowledge Base | Existe | `/dashboard/ai-assistants` (tab) | `knowledge_bases`, `knowledge_entries`, `knowledge_sources` | **Corrigido: search keyword-based (embedding API nao suportada)** |
| Knowledge embedding | Parcial | `knowledge-embedding` edge func | Tentativa de usar embeddings | **BUG: modelo embedding nao suportado pelo gateway** |
| Knowledge semantic search | Parcial | `knowledge-semantic-search` | Depende de embeddings | **Fallback para text search funciona** |
| Regras de seguranca IA | Existe | `useAiSafetyRules`, `useInboxSafety` | `conversation_rules` | Safety rules configuradas |
| Memoria por thread | Existe | `ai_agent_memory`, `ai_agent_strategic_memory` | `ai-memory-manager`, `ai-memory-embedder` | Memory com TTL e access log |
| Guardar drafts | Existe | `ai_message_audit` | Auditoria de prompts/respostas | Registado |
| Auditoria prompts | Existe | `ai_response_audits` | Grava user_message + ai_response | **Corrigido: agora grava mensagem correta** |
| Aprovacao humana | Parcial | `conversation_autopilot_state` | Estado auto/manual | Sem UI clara de approve/reject |
| Conversational flows | Existe | `/dashboard/conversational-engine` | `conversational_flows`, `flow_steps` | Flow builder visual |
| Vibe Profiles | Existe | `useVibeProfiles` | `vibe_profiles` | Tom de comunicacao |
| Conversation Objectives | Existe | `useConversationObjectives` | `conversation_objectives` + `conversation_objective_progress` | Tracking de progresso |
| AI Followup | Existe | `useAgentFollowup` | `ai-followup-draft`, `conversation_followups` | Follow-up automatico |
| RAG (Retrieval Augmented) | Existe | `rag-index-outcome`, `rag-search` | Indexa resultados para aprendizagem | |

### E) PIPELINES / OPORTUNIDADES

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Kanban board | Existe | `/dashboard/opportunities` ou `/dashboard/crm` | `opportunities` + `pipeline_stages` | Drag & drop |
| Criar oportunidade | Existe | Dialog form | `opportunities` tabela | Com valor, probabilidade |
| Mover etapa | Existe | Drag no Kanban | Update `stage_id` | |
| Campos: valor, prob, responsavel, datas | Existe | `opportunities` colunas | `value`, `probability`, `assigned_to`, `expected_close_date` | |
| Metricas por coluna | Parcial | Sumario visual | Calculado client-side | Sem metricas server-side pre-calculadas |
| Pipeline customizavel | Existe | `/dashboard/settings/pipelines` | `pipelines` + `pipeline_stages` | Multiplos pipelines |
| Generate pipeline IA | Existe | `useGeneratePipeline` | `generate-pipeline` edge function | IA gera etapas |
| AI Opportunity Coach | Existe | `useAgentAnalysis` | `ai-opportunity-coach` | Sugestoes por oportunidade |
| Blueprint (templates) | Existe | `useBlueprints` | `crm_blueprints` | Templates de pipeline |

### F) AUTOMATIONS / WORKFLOWS

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Regras de automacao | Existe | `/dashboard/automations` | `automation_rules`, `automation_actions`, `automation_conditions` | Trigger/condition/action |
| Execucao | Existe | `workflow-processor`, `workflow-trigger` | Edge functions | |
| Logs | Existe | `automation_logs` | Registo de execucoes | |
| Execution tracking | Existe | `automation_execution_tracking`, `automation_chain_tracking` | Anti-loop | |
| Idempotencia | Parcial | `automation_chain_tracking` | Hash-based dedup | Depende de implementacao por funcao |
| AI Generate Automation | Existe | `useGenerateAutomation` | `ai-generate-automation` | IA cria workflows |
| AI Contextual Automation | Existe | Edge function | `ai-contextual-automation` | Sugere automacoes |
| Parallel Dispatch | Existe | `useParallelDispatch` | `parallel-dispatch` | Execucao paralela |
| Trigger.dev integration | Existe | `@trigger.dev/sdk` instalado | `trigger-dispatch`, `trigger-webhook` | Jobs async |

### G) DASHBOARDS / KPI

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Dashboard principal | Existe | `/dashboard` | `useDashboardData` | KPIs, graficos |
| KPIs detalhados | Existe | `/dashboard/reports/kpis` | `useKPIs` | Metricas por periodo |
| Relatorios overview | Existe | `/dashboard/reports` | `ReportsOverview` | Visao executiva |
| Forecasts | Existe | `/dashboard/reports/forecasts` | `useForecastsReports` | Previsao de receita |
| Consumo/sessoes | Existe | `/dashboard/reports/consumption` | `ReportsConsumption` | |
| Retencao | Existe | `/dashboard/reports/retention` | `ReportsRetention` | |
| Growth | Existe | `/dashboard/reports/growth` | `ReportsGrowth` | |
| Sales reports | Existe | `/dashboard/reports/sales` | `ReportsSales` | |
| Metas vs Resultados | Existe | `/dashboard/reports/goals` | `useGoalsVsResults`, `useSalesGoals` | Comparacao |
| Dashboard customizavel | Existe | `useDashboardLayout` | `dashboard_layouts` tabela | Drag rearrange |
| AI Dashboard Insights | Existe | `useAIInsights` | `ai-dashboard-insights` | IA analisa metricas |
| SaaS Metrics | Existe | `useSaaSMetrics` | MRR, churn, LTV | |

### H) SETTINGS / INTEGRACOES

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Settings gerais | Existe | `/dashboard/settings` | Multiplas tabs | CRM data, pipelines, security, billing, integrations |
| Workspace settings | Existe | `useWorkspaceSettings` | `workspaces` + `workspace_settings` | |
| Instagram OAuth | Existe | Settings integrations | `instagram-auth-url`, `instagram-oauth-callback` | |
| WhatsApp OAuth | Existe | Settings integrations | `whatsapp-auth-url`, `whatsapp-oauth-callback` | |
| Email connection | Existe | `useEmailConnection` | `email-connect`, `email-disconnect` | |
| GHL (GoHighLevel) | Existe | `useWorkspaceGHLConfig` | `ghl_config`, `ghl-sync-contacts` | Sync bi-direcional |
| Video meetings | Existe | `useWorkspaceVideoConfig` | `create-video-meeting`, `video-auth-url` | |
| Stripe | Existe | `useWorkspaceStripeConfig` | `stripe-webhook`, `test-stripe-connection` | |
| Workspace instances | Existe | SuperAdmin | `workspace_instances` | Multi-instance |
| Admin settings | Existe | SuperAdmin | `admin_settings` | Key-value global |
| Audit logs | Existe | `admin_audit_logs` | Acoes administrativas | |

### I) BILLING / LIMITES

| Funcionalidade | Estado | Rota/Ecra | Backend | Notas/Riscos |
|---|---|---|---|---|
| Planos por workspace | Existe | `SubscriptionContext` | `workspace_subscriptions` | Plano ativo |
| Quotas/contadores | Existe | `useCredits`, `useModuleBilling` | `workspace_usage`, `credit_packages`, `credit_purchases` | |
| Feature gates | Existe | `useEntitlements` | `client_entitlements` | Bloqueio por plano |
| Module marketplace | Existe | `/dashboard/marketplace` | `marketplace_modules`, `workspace_module_installs` | Compra/instala modulos |
| Module billing | Existe | `module-checkout`, `module-consume-credits` | Edge functions | Credits system |
| Stripe webhooks | Existe | `stripe-webhook`, `subscription-webhook` | Processamento eventos | |
| Billing events | Existe | `billing_events` | Log de eventos billing | |
| Trial management | Existe | `useModuleTrial` | `module_trial_logs` | Trial tracking |

---

## 2) MATRIZ DE TESTES (Casos Criticos)

| ID | Pre-condicoes | Passos | Resultado Esperado | Resultado Atual |
|---|---|---|---|---|
| T01 | Sem conta | Signup > confirmar email > login | Dashboard com onboarding | **Nao testado: confirmar se email verification esta ativo** |
| T02 | User autenticado, 0 workspaces | Aceder `/dashboard` | Redirect para `/onboarding` | Existe (DashboardLayout verifica) |
| T03 | User autenticado, 1+ workspace | Aceder `/dashboard` | Dashboard com workspace selecionado | Existe |
| T04 | User A, workspace X | Query tabela `contacts` | So ve contactos de workspace X | **Depende de RLS** -- policies existem |
| T05 | User A, workspace X | Tentar aceder dados de workspace Y via API | Retorno vazio / forbidden | Depende de RLS filtering |
| T06 | Mensagem IG recebida | Webhook dispara > autopilot processa | Resposta baseada em KB + goals | **Corrigido recentemente** |
| T07 | Conversa com 50+ msgs | Autopilot processa | Usa ultimas 20 mensagens | **Corrigido: DESC + reverse** |
| T08 | Pergunta sobre produto | AI procura KB | Encontra entrada relevante e responde | **Corrigido: keyword search + validated status** |
| T09 | Super Admin | Aceder `/super-admin` | Dashboard administrativo completo | Existe, com sidebar |
| T10 | User normal | Aceder `/super-admin` | "Acesso Negado" | Existe (useUserRole check) |
| T11 | Pipeline com oportunidades | Drag card entre etapas | Stage atualizado, valor recalculado | A verificar client-side |
| T12 | Criar proposta | Preencher > enviar link publico | Proposta visivel em `/p/:slug` | Existe |
| T13 | Workspace owner | Convidar membro | Membro adicionado com role | A verificar |
| T14 | Automation rule ativa | Trigger event ocorre | Acao executada e logada | Depende de implementacao |
| T15 | Module trial | Instalar modulo free trial | Trial ativo com contador | Existe |

---

## 3) BUG LIST PRIORITIZADA

### P0 (Bloqueante)

| # | Titulo | Passos | Resultado Atual | Esperado | Causa Provavel | Correcao |
|---|---|---|---|---|---|---|
| P0-1 | **Embedding API falha sempre** | KB com embeddings > query semantica | Erro `invalid model: text-embedding-ada-002` | Pesquisa semantica funciona | Lovable AI Gateway nao suporta modelos embedding | **Mitigado: fallback keyword search implementado. Solucao real: remover chamada embedding de todas as funcoes (knowledge-semantic-search, knowledge-embedding, ai-memory-embedder)** |
| P0-2 | **0 triggers SQL para RLS enforcement** | Verificar triggers | 0 triggers de enforcement | Triggers para garantir workspace_id | Nao foram criados triggers de validacao | Criar validation triggers para tabelas criticas (contacts, leads, opportunities, messages) |
| P0-3 | **~40 tabelas sem INSERT policy** | Tentar inserir dados via client | RLS block ou bypass via service_role | INSERT funciona para users autenticados | Policies incompletas em tabelas operacionais | Adicionar INSERT policies com workspace_id check |

### P1 (Grave)

| # | Titulo | Passos | Resultado Atual | Esperado | Causa Provavel | Correcao |
|---|---|---|---|---|---|---|
| P1-1 | **Permissive RLS policies (USING true)** | Linter detecta 55 warnings | `conversation_autopilot_state`, `demo_leads`, `fastclub_applications`, `gdpr_consents` com `USING(true)` para UPDATE/INSERT/DELETE | Policies restritivas | Policies criadas sem filtro workspace | Adicionar `workspace_id = current_workspace_id()` ou equivalente |
| P1-2 | **11 funcoes DB sem search_path set** | Linter warning | Funcoes vulneraveis a schema injection | `SET search_path = public` | Omissao na criacao | Adicionar `SET search_path = public` a todas as funcoes SECURITY DEFINER |
| P1-3 | **Nenhum evento de auditoria para auth** | Login/signup | Sem registo de `auth.login_success` | Eventos gravados | Nao implementado | Criar trigger ou log em AuthContext |
| P1-4 | **Reset password sem UI dedicada** | User esquece password | Sem pagina `/forgot-password` no CRM | Flow completo | Pagina nao existe | Criar pagina com `supabase.auth.resetPasswordForEmail` |
| P1-5 | **Aprovacao humana sem UI clara** | Autopilot sugere resposta | Estado em `conversation_autopilot_state` mas sem botao approve/reject visivel | Botoes de acao | UI nao implementada | Adicionar approve/reject na InboxView |
| P1-6 | **Knowledge entries em draft por defeito** | Criar entrada KB | Status `draft`, invisivel para autopilot | Status `validated` apos criacao ou review | Fluxo de validacao nao implementado | Adicionar toggle de publicacao ou auto-validate |
| P1-7 | **Extension em schema public** | Linter warning | Extensao instalada em public | Extensao em schema dedicado | Padrao Supabase | Mover extensao para schema separado |

### P2 (Melhoria)

| # | Titulo | Notas |
|---|---|---|
| P2-1 | **Sem full-text search nativo** | Pesquisa de contactos/leads usa ILIKE, sem tsvector/tsquery |
| P2-2 | **Metricas pipeline client-side** | Somas por coluna calculadas no browser, sem view materializada |
| P2-3 | **Sem paginacao server-side em listas grandes** | Contactos, leads podem exceder 1000 rows (limite Supabase default) |
| P2-4 | **Sem rate limiting nas edge functions** | Nenhuma funcao tem rate limit implementado |
| P2-5 | **Sem retry logic em webhooks** | Instagram/WhatsApp webhooks sem retry em caso de falha |
| P2-6 | **Dashboard layouts sem validacao** | `dashboard_layouts` aceita JSON arbitrario |
| P2-7 | **Workspace slug sem validacao de unicidade forte** | Slug gerado client-side com regex basica |
| P2-8 | **Sem export de contactos** | Import existe mas export nao esta visivel |
| P2-9 | **Sem dark mode consistente** | `next-themes` instalado mas utilizacao inconsistente |
| P2-10 | **Sem testes automatizados** | Zero testes unitarios ou E2E no projeto |

---

## 4) GAPS / REQUISITOS EM FALTA

| Gap | Impacto | Descricao |
|---|---|---|
| **Forgot Password (CRM)** | Alto | Nao existe pagina dedicada no CRM (existe no Client Portal) |
| **Email verification feedback** | Medio | Nao ha UI que informe o user para verificar email apos signup |
| **Bulk actions** | Medio | Sem selecao multipla + acao em massa em listas (contactos, leads) |
| **Webhook retry/DLQ** | Alto | Webhooks de IG/WA/Email nao tem dead letter queue nem retry |
| **Observability dashboard** | Alto | Sem painel para ver saude do sistema (erros, latencia, throughput) |
| **Data export** | Medio | Sem export CSV/PDF de listas de dados |
| **Mobile-responsive inbox** | Medio | Inbox pode nao funcionar bem em mobile |
| **Multi-language** | Baixo | App em portugues, sem suporte i18n |
| **2FA** | Medio | Sem autenticacao de dois fatores |
| **Audit trail para dados** | Alto | Sem historico de alteracoes em campos de contactos/leads (quem mudou o que) |
| **Webhook signature validation** | Alto | Verificar se webhooks validam assinaturas (IG, WA, Stripe) |

---

## 5) OBSERVABILIDADE

### O que existe (39 tabelas de logs/eventos):

| Categoria | Tabelas | Cobertura |
|---|---|---|
| Admin | `admin_audit_logs` | Acoes admin |
| AI | `ai_analytics_events`, `ai_message_audit`, `ai_response_audits`, `ai_memory_access_log` | Prompts, respostas, cache |
| Automacao | `automation_logs`, `automation_execution_tracking`, `automation_chain_tracking` | Execucoes e dedup |
| Billing | `billing_events`, `stripe_event_log`, `subscription_events` | Eventos de pagamento |
| Conversas | `autopilot_events`, `conversation_journey`, `conversation_replays` | Flow de conversa |
| Marketing | `marketing_events`, `template_usage_events` | Campanhas |
| Modulos | `module_action_logs`, `module_access_logs`, `module_trial_logs` | Uso de modulos |
| Store | `store_order_events`, `store_automation_events` | E-commerce |
| Consumo | `consumption_logs`, `credit_consumption_logs`, `usage_events` | Quotas |

### O que FALTA:

| Evento | Importancia | Estado |
|---|---|---|
| `auth.login_success` | Critico | **Nao existe** |
| `auth.login_failed` | Critico | **Nao existe** |
| `auth.signup` | Critico | **Nao existe** |
| `workspace.created` | Alto | Parcial (sem evento dedicado) |
| `workspace.selected` | Baixo | **Nao existe** |
| `contact.created/updated/deleted` | Alto | Parcial via `entity_activities` |
| `thread.created/updated` | Medio | **Nao existe como evento dedicado** |
| `message.received/sent` | Alto | Parcial via triggers existentes |
| `ai.draft_accepted/rejected` | Alto | **Nao existe** |
| `opportunity.stage_changed` | Alto | **Nao existe como evento dedicado** |
| `settings.updated` | Medio | Parcial via admin_audit_logs |
| **Error tracking centralizado** | Critico | **Nao existe** (erros vao para console.error) |
| **Latencia de edge functions** | Alto | **Nao existe** |
| **Health check endpoint** | Alto | **Nao existe** |

---

## 6) PLANO DE CORRECAO

### Fase 1: P0 Criticos (Semana 1-2)

1. **Corrigir embedding API fallback em TODAS as funcoes** -- remover chamadas a `text-embedding-ada-002` em `knowledge-semantic-search`, `knowledge-embedding`, `ai-memory-embedder`, `product-embedding`. Substituir por keyword search ou usar modelo de chat para gerar queries.

2. **Adicionar INSERT/UPDATE/DELETE policies** nas ~40 tabelas que so tem SELECT. Prioridade: tabelas com dados de negocio (`autopilot_config`, `automation_actions`, `automation_conditions`, `availability_*`, `calendar_*`).

3. **Fixar funcoes sem search_path** -- adicionar `SET search_path = public` a todas as funcoes SECURITY DEFINER.

### Fase 2: P1 Graves (Semana 2-3)

4. **Criar pagina Forgot Password** -- `/forgot-password` com `supabase.auth.resetPasswordForEmail`.

5. **Adicionar eventos de auth** -- gravar login_success, login_failed, signup em tabela `auth_events`.

6. **Restringir policies permissivas** -- substituir `USING(true)` por filtros adequados em `conversation_autopilot_state`, `demo_leads`, `gdpr_consents`, etc.

7. **UI de aprovacao humana no autopilot** -- botoes approve/reject na InboxView quando autopilot sugere resposta.

8. **Knowledge Base: auto-validate ou toggle** -- entrada criada deve ter status `validated` por defeito, ou toggle visivel no UI.

### Fase 3: Quick Wins UX (Semana 3-4)

9. **Paginacao server-side** em listas de contactos, leads, empresas (`.range()` no Supabase).

10. **Empty states** -- verificar que todas as listas tem mensagem quando vazias.

11. **Loading/error states** -- garantir spinner + error boundary em todas as paginas.

12. **Bulk select + actions** -- selecao multipla em listas para delete/tag/assign em massa.

13. **Export CSV** -- botao de export em listas de contactos, leads, oportunidades.

### Fase 4: Observabilidade (Semana 4-5)

14. **Criar tabela `system_events`** unificada com schema: `workspace_id, actor_id, entity_type, entity_id, event_type, payload, created_at`.

15. **Health check edge function** -- endpoint simples que verifica DB connectivity + retorna status.

16. **Error tracking** -- wrapper para edge functions que grava erros em tabela dedicada.

### Fase 5: Robustez (Semana 5-6)

17. **Rate limiting** em edge functions publicas (verify_jwt=false).

18. **Webhook signature validation** -- verificar signatures de Instagram, WhatsApp, Stripe.

19. **Retry logic** -- dead letter queue para webhooks falhados.

20. **Testes E2E** -- iniciar com flows criticos: auth > create workspace > create lead > create opportunity > send message.

---

### TOP 10 P0

1. Embedding API falha em todas as funcoes que usam `text-embedding-ada-002`
2. ~40 tabelas sem INSERT policy (RLS incompleto)
3. 0 validation triggers para workspace_id enforcement
4. Funcoes SECURITY DEFINER sem search_path fixo (11 funcoes)
5. Policies `USING(true)` em tabelas com dados sensiveis
6. Sem reset password UI no CRM
7. Knowledge entries em draft invisiveis ao autopilot
8. Webhooks sem retry/DLQ
9. Sem rate limiting em edge functions publicas
10. Sem error tracking centralizado

### TOP 10 P1

1. Sem eventos de auditoria para auth (login/signup)
2. Sem UI de aprovacao humana para autopilot
3. Sem evento dedicado para stage_changed em oportunidades
4. Sem ai.draft_accepted/rejected tracking
5. Extensao em schema public
6. Sem health check endpoint
7. Import existe mas export nao
8. Sem paginacao server-side (limite 1000 rows)
9. Sem validacao de unicidade forte em workspace slug
10. Sem 2FA

### 10 MELHORIAS UX RAPIDAS

1. Adicionar empty states em todas as listas vazias
2. Adicionar loading skeletons em vez de spinners genericos
3. Adicionar breadcrumbs em paginas de detalhe
4. Confirmar acao antes de apagar (dialog de confirmacao em todos os deletes)
5. Toast de sucesso apos criar/editar entidade
6. Keyboard shortcuts (Cmd+K para pesquisa global)
7. Botao "Voltar" consistente em paginas de detalhe
8. Indicador visual de workspace ativo mais proeminente
9. Contador de notificacoes no sidebar
10. Filtros persistentes (guardar estado de filtros em URL params)

### DEFINICAO DE PRONTO PARA PRODUCAO

- [ ] Todas as tabelas com RLS policies completas (SELECT + INSERT + UPDATE + DELETE)
- [ ] Todas as funcoes SECURITY DEFINER com search_path fixo
- [ ] Zero policies `USING(true)` em tabelas com dados de negocio
- [ ] Reset password funcional
- [ ] Email verification ativo e comunicado ao user
- [ ] Eventos de auth gravados (login/signup/failed)
- [ ] Knowledge Base com status management funcional
- [ ] Embedding API removida ou substituida por alternativa funcional
- [ ] Rate limiting em edge functions publicas
- [ ] Webhook signature validation (IG, WA, Stripe)
- [ ] Health check endpoint disponivel
- [ ] Error tracking centralizado
- [ ] Paginacao server-side em listas > 100 items
- [ ] Testes E2E para flows criticos (auth, CRUD, messaging)
- [ ] Backup strategy documentada
- [ ] GDPR compliance verificado (right to delete, export data)
