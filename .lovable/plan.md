

## Analytics Privacy-First: Gap Analysis e Plano de Implementacao

### Resumo Executivo

O hook `useCRMAnalytics` ja define **16 funcoes de tracking** cobrindo Inbox, Templates, CRM, AI, Automacoes e Billing. No entanto, apenas **7 de 16** estao realmente integradas nos componentes UI. As restantes 9 funcoes existem no hook mas nunca sao chamadas — sao "dead code" funcional.

A infraestrutura base (GTM, Consent Mode v2, sanitizacao PII, bucketizacao) esta completa e funcional. O trabalho restante e exclusivamente **wiring** — ligar as funcoes de tracking existentes aos pontos de interacao corretos nos componentes.

---

### Gap List

| # | Area | Evento | Estado Atual | Ficheiro de Integracao | Severidade |
|---|------|--------|-------------|----------------------|------------|
| 1 | UI | `trackLeadMovedPipeline` | Definido no hook, nunca chamado | `OpportunitiesModule.tsx` (handleMoveOpportunity), `CrmBoardView.tsx` (handleMoveOpportunity) | High |
| 2 | UI | `trackOpportunityCreated` | Definido no hook, nunca chamado | `CreateOpportunityEnhancedDialog.tsx` (onSubmit), `OpportunityTriggerBanner.tsx` | High |
| 3 | UI | `trackTemplateUsed` | Definido no hook, nunca chamado | `InboxTemplatePanel.tsx` (quando template e inserido na conversa) | High |
| 4 | UI | `trackTemplateConversion` | Definido no hook, nunca chamado | Nenhum trigger UI direto — deve ser backend/edge function | Medium |
| 5 | UI | `trackConversationConverted` | Definido no hook, nunca chamado | `OpportunityTriggerBanner.tsx` (quando oportunidade e criada a partir de conversa) | High |
| 6 | UI | `trackAISuggestionRejected` | Definido no hook, nunca chamado | `AIMessageComposer.tsx` (quando sugestao e descartada/fechada sem usar) | Medium |
| 7 | UI | `trackAutomationTriggered` | Definido no hook, nunca chamado | Backend-side — edge function `run-automation` | Low |
| 8 | UI | `trackCheckoutCompleted` | Definido no hook, nunca chamado | Pagina de sucesso pos-checkout ou webhook Stripe | High |
| 9 | UI | `trackTemplateUsed` (comm templates) | Definido no hook, nunca chamado | `InboxTemplatePanel.tsx` quando communication template e aplicado | Medium |

### Eventos JA Integrados (Confirmados)

| Evento | Componente | Estado |
|--------|-----------|--------|
| `crm.session_start` | `useCRMAnalytics` (useEffect) | OK |
| `inbox.opened` | `InboxView.tsx` | OK |
| `conversation.opened` | `ConversationDetail.tsx` | OK |
| `conversation.replied` | `AIMessageComposer.tsx` | OK |
| `ai.suggestion.generated` | `AIMessageComposer.tsx` | OK |
| `ai.suggestion.accepted` | `AIMessageComposer.tsx` | OK |
| `automation.created` | `VisualAutomationBuilder.tsx` | OK |
| `checkout.started` | `PricingCards.tsx` | OK |
| `lead.created` | `CreateLeadDialog.tsx` | OK |

---

### Plano de Implementacao (Fase Unica — Wiring)

Todas as alteracoes sao de **1-5 linhas por ficheiro** — importar o hook e chamar a funcao no momento correto.

#### 1. `trackLeadMovedPipeline` — Pipeline Drag/Move

**Ficheiros**: `src/components/opportunities/OpportunitiesModule.tsx` e `src/components/crm/unified/CrmBoardView.tsx`

- Importar `useCRMAnalytics`
- No `handleMoveOpportunity`, apos sucesso do mutateAsync, chamar `trackLeadMovedPipeline({ from_stage, to_stage, days_in_previous_stage })`
- Obter `from_stage` do estado atual da oportunidade antes do move

#### 2. `trackOpportunityCreated` — Dialogo de Criacao

**Ficheiro**: `src/components/opportunities/CreateOpportunityEnhancedDialog.tsx`

- Importar `useCRMAnalytics`
- No `onSubmit`, apos sucesso do createOpportunity, chamar `trackOpportunityCreated({ value: values.value, origin: 'manual' })`

**Ficheiro**: `src/components/inbox/OpportunityTriggerBanner.tsx`

- Importar `useCRMAnalytics`
- Apos criacao, chamar `trackOpportunityCreated({ value, origin: 'inbox' })`

#### 3. `trackConversationConverted` — Conversao via Inbox

**Ficheiro**: `src/components/inbox/OpportunityTriggerBanner.tsx`

- Apos criacao de oportunidade a partir de conversa, chamar `trackConversationConverted({ days_to_convert, used_ai_in_thread, used_template, priority_score_at_start })`

#### 4. `trackTemplateUsed` — Aplicacao de Template

**Ficheiro**: `src/components/inbox/InboxTemplatePanel.tsx`

- Quando um template e inserido (callback onInsert/onApply), chamar `trackTemplateUsed({ structure_type, dynamic, ai_adapted, pipeline_stage_when_used })`

#### 5. `trackAISuggestionRejected` — Fechar Painel AI sem Usar

**Ficheiro**: `src/components/inbox/AIMessageComposer.tsx`

- Quando o painel AI e fechado (setShowAIPanel(false)) SEM ter usado nenhuma sugestao, chamar `trackAISuggestionRejected({ context: 'inbox' })`

#### 6. `trackCheckoutCompleted` — Pos-Checkout

**Ficheiro**: Pagina de retorno do Stripe ou componente que deteta subscricao ativa apos checkout

- Detetar transicao de estado (sem plano -> com plano) e chamar `trackCheckoutCompleted({ plan_type, billing_cycle })`

#### 7. `trackTemplateConversion` e `trackAutomationTriggered`

Estes sao eventos backend — devem ser implementados nas edge functions (`template-log-event` e `run-automation`) via `dataLayer` push no retorno ao frontend, ou como eventos server-side. Prioridade mais baixa.

---

### Validacao

Apos implementacao, confirmar em ambiente staging:

1. Abrir DevTools > Console e filtrar por `dataLayer`
2. Verificar que cada acao gera o evento correto com dados bucketizados
3. Confirmar que nenhum campo PII aparece nos eventos (nome, email, conteudo)
4. Confirmar que eventos so disparam com `consent.analytics === true`
5. Confirmar que em staging os eventos NAO sao enviados (gate `isProd`)

