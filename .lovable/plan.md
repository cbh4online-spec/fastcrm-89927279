# FastCRM WhatsApp Conversion Engine — Fase 1

## 1. O que já existe (verificado no código)

- **Templates WhatsApp**: `whatsapp_templates_view` (+ `whatsapp_templates_meta`) e `communication_templates` (canal, tags, dynamic_schema, status/aprovação, usage_count, response_rate). Hooks `useWhatsAppTemplates`, `useCommunicationTemplates`, `useTemplateRecommendations`, `usePredictiveTemplates`. Componentes `WhatsAppTemplatePicker`, `WhatsAppTemplateDialog`.
- **Variáveis dinâmicas**: `src/lib/whatsappQuickVariables.ts` (resolver + render + deteção) e `src/lib/templateVariables.ts`, mais `generate-dynamic-template-context`.
- **Sequências**: `whatsapp_sequences`, `_steps`, `_enrollments`, `_logs`, com `stop_on_reply`, janelas de envio e a edge function `whatsapp-pro-sequence-dispatch` (já trata opt-out e conclusão).
- **Next Best Action**: tabelas `next_best_actions`, `next_best_action_settings`, `next_best_action_logs`, edge function `process-next-best-actions` (priority score, urgência, confiança, payload sugerido) e hook `useNextBestActions`.
- **Analytics de templates**: `template_usage_events` (event_type, canal, lead/contacto/conversa, stage, score, intent, sentimento, variant_id), `template-log-event`, `template-recompute-stats`, `template-predict-best-variant`.
- **Perfil comercial da lead**: `leads` já tem `ai_temperature`, `ai_next_action`, `ai_next_action_type`, `engagement_score`, `conversion_probability`, `icp_fit_score`, `automation_active`, campos de origem/campanha e campos personalizados.
- **Envio e consentimento**: `whatsapp-pro-send`, consentimento fail-closed (`has_whatsapp_consent`), opt-outs e revalidação no dispatcher.

## 2. O que se reutiliza (sem duplicar)

Toda a camada acima. Não se cria novo motor de templates, nem nova tabela de sequências, nem novo NBA, nem novo sistema de analytics.

## 3. O que falta

1. Taxonomia comercial dos templates (família/subfamília, código interno, estágio, objetivo, timing, condições de uso/exclusão, princípio comportamental, KPI, prioridade, modo automático/assistido/manual, versão).
2. Seeds dos templates LEAD_NEW_01..06 e QUALIFY_01..05.
3. Variáveis comerciais em falta (`{{comercial}}`, `{{problema_principal}}`, `{{objetivo_cliente}}`, `{{objecao}}`, `{{link_proposta}}`, `{{data_reuniao}}`, `{{opcao_1..3}}`, `{{pergunta_qualificacao_binaria}}`, etc.) e um **guard de variáveis não resolvidas**.
4. Regras determinísticas de Next Best Action para o ciclo WhatsApp (mapeamento estado → ação → template).
5. Painel "Próxima Melhor Ação" na ficha da lead com preview, enviar/editar/alternativa/ignorar.
6. Dashboard de performance por template orientado a resposta→conversa→agendamento→proposta→venda.

## 4. Alterações propostas

### Base de dados (migrations aditivas)
- `whatsapp_template_playbook` — metadados comerciais por template (`template_id`, `code` único por workspace, `family`, `subfamily`, `pipeline_stage`, `objective`, `timing_min_minutes`/`max`, `use_conditions` jsonb, `exclusion_conditions` jsonb, `cta`, `behavioral_principle`, `primary_kpi`, `priority`, `execution_mode` automatic|assisted|manual, `version`, `is_active`). RLS por workspace + GRANTs. Não toca nas tabelas de templates existentes.
- `lead_commercial_profile` — apenas os campos que **não** existem em `leads`: `objetivo_cliente`, `problema_principal`, `consequencia`, `timing`, `objecao_principal`, `first_reply_at`, `next_action_at`, `snooze_until`. Restantes campos lidos de `leads`/`opportunities`/agendamentos.
- Extensão de `next_best_actions.suggested_payload_json` (sem DDL) para transportar `template_code`, `rendered_preview`, `missing_variables`.

### Lógica partilhada (pura, testável)
- `src/lib/whatsapp/engine/families.ts` — enums de família/subfamília e `NextBestActionKind` (SEND_MESSAGE, ASK_QUESTION, SCHEDULE_MEETING, SEND_PROPOSAL, FOLLOW_UP_PROPOSAL, HANDLE_OBJECTION, FOLLOW_UP, REACTIVATE, WAIT, STOP_CONTACT).
- `src/lib/whatsapp/engine/decide.ts` — função pura `decideNextBestAction(context)` → `{ action, templateCode, reason, priority, timing }`, com regras determinísticas (sem IA nesta fase).
- `src/lib/whatsapp/engine/render.ts` — extensão do resolver de variáveis + `assertNoUnresolvedVariables()`; envio automático bloqueado se faltar variável obrigatória, com fallback seguro declarado no playbook.
- `src/lib/whatsapp/engine/seeds.ts` — LEAD_NEW_01..06 e QUALIFY_01..05 com todos os metadados.

### Backend
- Nova edge function `whatsapp-engine-recommend` (calcula e faz upsert em `next_best_actions` para leads WhatsApp, reutilizando o mesmo formato do `process-next-best-actions`).
- `whatsapp-pro-sequence-dispatch`: reforço das condições de paragem (resposta, agendamento, proposta aceite, perdido, snooze, `automation_active=false`, STOP_CONTACT) com revalidação imediatamente antes do envio e claim atómico do enrollment contra duplicados.
- `template-log-event`: passar a registar os eventos do funil (reply, meeting, proposal, won) já suportados pelo schema.

### Frontend
- `NextBestActionCard` na ficha da lead (via `LeadDetailWithSidebar`), com temperatura, estágio, última interação, template recomendado, preview e ações Enviar / Editar / Ver alternativas / Ignorar. Sem envio automático.
- Nova secção "Playbook" no ecrã de templates WhatsApp (família, código, timing, KPI, modo) reutilizando os componentes atuais.
- Dashboard "Performance de Templates WhatsApp" com comparação A/B a partir de `template_usage_events`.

## 5. Riscos de regressão

- Alterações ao `whatsapp-pro-sequence-dispatch` podem afetar sequências ativas — mitigação: guards aditivos, sem alterar o caminho feliz, cobertos por testes.
- Metadados em tabela separada evitam mexer nos templates existentes e nos estados de aprovação.
- Nada é publicado, nenhuma campanha/sequência é ativada, nenhuma mensagem é enviada, nenhum template é aplicado a leads reais.

## 6. Testes

Unitários do motor de decisão (nova lead → LEAD_NEW_01; sem resposta 20 min → LEAD_NEW_02; 4h → 03; 24h → 04; 48–72h → 05 e depois nurturing; "agora não" → 06 + snooze), guard de variáveis não resolvidas, paragem por resposta/agendamento/proposta/perdido/STOP_CONTACT, idempotência anti-duplicados, e isolamento por workspace (RLS). Mais typecheck, testes WhatsApp existentes e build de produção.

## 7. Execução incremental

1. Migrations + seeds + motor puro + testes.
2. Edge function de recomendação + reforço do dispatcher.
3. UI da ficha da lead.
4. Playbook no ecrã de templates + dashboard de performance.
