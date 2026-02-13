

## FastCRM Privacy-First Analytics Layer (Clarity + GTM)

### Resumo

Criar uma camada de analytics unificada e privacy-first que envia eventos comportamentais ao dataLayer (GTM/Clarity) sem dados pessoais. Inclui: contexto global por sessao, eventos por modulo (Inbox, Templates, CRM, IA, Automacoes, Billing), metricas compostas estrategicas, e camada de seguranca com validacao de consentimento.

### Arquitetura

A implementacao reutiliza o sistema existente:
- `useTracking` (growth-seo) ja faz push ao dataLayer com validacao de consent
- `useConsent` ja gere o estado GDPR (analytics/marketing)
- `gtmEvents.ts` ja tem pattern de pushToDataLayer

A nova camada sera um hook dedicado `useCRMAnalytics` para o dashboard (separado do `useTracking` do SEO/growth).

---

### 1. Hook Principal: `useCRMAnalytics`

Novo ficheiro: `src/hooks/useCRMAnalytics.ts`

**Contexto Global (enviado uma vez por sessao via sessionStorage flag):**

```text
workspace_id (UUID)
user_id (UUID)
role (owner/admin/agent/viewer)
plan (free/basic/pro/agency)
env (prod/staging)
app_version (from package.json or constant)
device_type (desktop/mobile — via window.innerWidth)
locale (navigator.language)
```

Fontes de dados:
- `useWorkspace()` -> workspace_id, role
- `useAuth()` -> user_id
- `useSubscription()` -> plan
- Derivados: device_type, locale, env

**Funcao auxiliar `sanitizeBucket`:**
- Converte valores numericos em buckets (0-500 / 500-2000 / 2000+)
- Converte tempos em buckets (<5min / 5-30 / 30-120 / 120+)
- Nunca envia valores exatos que possam identificar

---

### 2. Eventos por Modulo

**2.1 Inbox 3.0**

| Evento | Propriedades |
|---|---|
| `inbox.opened` | total_conversations, requires_response_count, follow_up_count, active_opportunity_count, sla_risk_count |
| `conversation.opened` | priority_score, sla_risk, pipeline_stage, potential_value_bucket, conversion_probability_bucket, channel |
| `conversation.replied` | response_time_bucket, ai_used, template_used, follow_up_scheduled |
| `conversation.converted` | days_to_convert, used_ai_in_thread, used_template, priority_score_at_start |

Integracao: instrumentar `InboxView`, `ConversationPanel`, `MessageComposer`.

**2.2 Templates 2.0**

| Evento | Propriedades |
|---|---|
| `template.created` | structure_type, channel, is_dynamic |
| `template.used` | structure_type, dynamic, ai_adapted, pipeline_stage_when_used, lead_score_bucket |
| `template.conversion` | days_to_conversion, structure_type, dynamic, channel |

**2.3 CRM Core**

| Evento | Propriedades |
|---|---|
| `lead.created` | source_type, industry_segment, lead_score_bucket |
| `lead.moved_pipeline` | from_stage, to_stage, days_in_previous_stage |
| `opportunity.created` | value_bucket, industry_segment, origin |

**2.4 Modulos IA**

| Evento | Propriedades |
|---|---|
| `ai.suggestion.generated` | context, intent_detected, recommended_tone |
| `ai.suggestion.accepted` | context, tone_used, edited_before_send |
| `ai.suggestion.rejected` | context, intent_detected |

**2.5 Automacoes**

| Evento | Propriedades |
|---|---|
| `automation.created` | trigger_type, actions_count, complexity_bucket |
| `automation.triggered` | trigger_type, success |

**2.6 Billing**

| Evento | Propriedades |
|---|---|
| `checkout.started` | plan_type, upgrade_from_plan |
| `checkout.completed` | plan_type, billing_cycle |

---

### 3. Camada de Seguranca

Funcao `safePush(event, data)` que antes de enviar:

1. Verifica `consent.analytics === true` (via useConsent)
2. Verifica ambiente PROD (`window.location.hostname` check)
3. Sanitiza todos os campos — remove qualquer string que pareca email/telefone/nome
4. Nunca envia campos: content, body, subject, name, email, phone, message
5. Converte valores numericos em buckets quando aplicavel

---

### 4. Metricas Compostas (Calculadas no GTM/Clarity)

Nao sao eventos — sao derivadas dos eventos acima no lado do GTM:

1. **Inbox Efficiency Index**: response_time_bucket + sla_risk + conversation.converted
2. **AI Adoption Score**: ai_used frequency + ai.suggestion.accepted rate
3. **Template Effectiveness Index**: template.used count + template.conversion rate
4. **Revenue Acceleration Signal**: priority alta + response < 15min + conversion < 7 dias

Estas metricas sao configuradas no GTM/Clarity como custom dimensions/metrics, nao requerem codigo adicional.

---

### 5. Ficheiros a Criar/Alterar

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useCRMAnalytics.ts` | **Novo** — hook principal com todos os eventos + contexto global + seguranca |
| `src/lib/analyticsHelpers.ts` | **Novo** — funcoes puras: bucketize, sanitize, safePush |
| `src/components/inbox/InboxView.tsx` | Instrumentar inbox.opened |
| `src/components/inbox/ConversationPanel.tsx` | Instrumentar conversation.opened |
| `src/components/inbox/MessageComposer.tsx` ou equivalente | Instrumentar conversation.replied |
| `src/components/templates/` (componentes relevantes) | Instrumentar template.created/used |
| `src/components/leads/` (componentes relevantes) | Instrumentar lead.created, lead.moved_pipeline |
| `src/components/ai-agents/` (componentes relevantes) | Instrumentar ai.suggestion.* |
| `src/components/automations/` (componentes relevantes) | Instrumentar automation.* |

### 6. Ordem de Implementacao

1. Criar `src/lib/analyticsHelpers.ts` (bucketize, sanitize, safePush)
2. Criar `src/hooks/useCRMAnalytics.ts` (hook com todos os metodos de tracking + contexto global)
3. Instrumentar Inbox (inbox.opened, conversation.opened, conversation.replied)
4. Instrumentar Templates (template.created, template.used)
5. Instrumentar CRM Core (lead.created, lead.moved_pipeline, opportunity.created)
6. Instrumentar IA (ai.suggestion.*)
7. Instrumentar Automacoes + Billing

### Secao Tecnica

**Pattern de uso nos componentes:**

```text
const { trackInboxOpened, trackConversationOpened } = useCRMAnalytics();

// No useEffect ou handler:
trackInboxOpened({
  total_conversations: conversations.length,
  requires_response_count: conversations.filter(c => c.needs_response).length,
  ...
});
```

**Contexto global — enviado uma vez por sessao:**

```text
useEffect(() => {
  if (sessionStorage.getItem('crm_ctx_sent')) return;
  safePush('crm.session_start', {
    workspace_id, user_id, role, plan, env, device_type, locale
  });
  sessionStorage.setItem('crm_ctx_sent', '1');
}, [workspace_id, user_id]);
```

**Sem novas tabelas DB** — tudo via dataLayer/GTM. Sem edge functions adicionais. Sem impacto no backend.

