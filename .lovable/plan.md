

## P1 — Evolução Estratégica do Módulo de Campanhas de Email

### Diagnóstico do Estado Actual

| Área | Existe | Lacuna |
|------|--------|--------|
| `marketing_events` | ✅ Tem campaign_id, recipient_id, email, event_type | **Não tem contact_id, lead_id, opportunity_id** |
| `marketing_recipients` | ✅ Tem contact_id, lead_id | Não liga eventos a timeline do CRM |
| `campaign_link_clicks` | ✅ Tem contact_id | Não tem lead_id |
| Revenue Attribution | ✅ `RevenueAttributionPanel` básico (clicks→opps→revenue) | Modelo único (equal share), sem first/last touch, sem janela configurável |
| Deliverability | ✅ `DeliverabilityDashboard` agregado 30d, `DeliverabilityPanel` por campanha | Sem score por segmento, sem trend, sem engagement decay |
| CRM Integration | ✅ `ContactJourneyTimeline` (busca por email) | Não integrado na ficha do contacto, sem tab dedicada |
| Triggers/Automação | ✅ `TriggerBuilder` com opened/clicked/not_opened/bounced → tag/sequence/webhook | Funcional, precisa de ligar a scoring |
| Dashboard | ✅ KPIs operacionais (sent/opened/clicked) | Sem leads gerados, sem opps influenciadas, sem revenue |

### Plano de Execução — 5 Batches

---

**B1 — Schema: contact_id/lead_id em marketing_events + tabela campaign_attribution**

Migração SQL:
- Adicionar `contact_id UUID REFERENCES contacts(id)` e `lead_id UUID REFERENCES leads(id)` a `marketing_events`
- Criar tabela `campaign_attribution`:
  - `id`, `workspace_id`, `campaign_id`, `contact_id`, `lead_id` (nullable), `opportunity_id` (nullable)
  - `attribution_model` TEXT (first_touch, last_touch, assisted, equal_share)
  - `attribution_type` TEXT (originated, influenced)
  - `revenue_attributed` NUMERIC, `revenue_influenced` NUMERIC
  - `attributed_at` TIMESTAMPTZ, `attribution_window_days` INT DEFAULT 30
  - `event_type` TEXT (click, open, etc.)
  - `created_at` TIMESTAMPTZ
  - RLS por workspace_members

Código:
- Actualizar `marketing-webhook` edge function para resolver `contact_id`/`lead_id` a partir do `recipient_id` quando insere `marketing_events`
- Actualizar tipos em `src/types/marketing.ts` para incluir novos campos em `MarketingEvent`

---

**B2 — CRM Attribution: Tab de Marketing na ficha do contacto/lead**

Criar `src/components/contacts/sections/ContactCampaignHistory.tsx`:
- Query `marketing_recipients` + `marketing_events` filtrado por `contact_id`
- Mostrar lista de campanhas recebidas com status (sent, opened, clicked, bounced, etc.)
- Timeline visual de interações de campanha
- Badge de engagement (activo, passivo, inactivo, bounce)

Criar `src/hooks/useContactCampaignHistory.ts`:
- Query que junta recipients + events + campaigns por contact_id

Integrar em `ENIContactDetailWithSidebar.tsx`:
- Adicionar secção "Marketing" no menu lateral
- Mostrar `ContactCampaignHistory` quando seleccionada

Replicar para leads em `LeadDetail.tsx` (mesma lógica, filtro por lead_id)

---

**B3 — Pipeline Attribution + Revenue**

Criar `src/hooks/useCampaignAttribution.ts`:
- Lógica de attribution configurável:
  - **First touch**: primeira campanha com interacção antes da criação da opp
  - **Last touch**: última campanha antes da conversão
  - **Equal share**: distribuição igual entre campanhas que tocaram o contacto
- Janela configurável (default 30 dias)
- Calcular `revenue_attributed` e `revenue_influenced` a partir de opportunities com stage=won

Criar edge function `compute-campaign-attribution`:
- Corre on-demand ou periodicamente
- Para cada opp fechada, resolve quais campanhas influenciaram via `marketing_events` + `campaign_link_clicks` dentro da janela
- Insere/actualiza `campaign_attribution`
- Calcula: opportunities_created, opportunities_influenced, revenue_attributed, revenue_influenced

Reforçar `RevenueAttributionPanel.tsx`:
- Usar dados da tabela `campaign_attribution` em vez de cálculo inline
- Mostrar attributed vs influenced separadamente
- Adicionar KPIs: leads gerados, opps influenciadas, revenue

Criar secção "Impacto Comercial" no `CampaignDetailDialog.tsx` tab Stats:
- Leads gerados por esta campanha (contacts criados com source=campaign)
- Opps influenciadas
- Revenue atribuída/influenciada

---

**B4 — Deliverability Avançada + Segmentação Comportamental**

Reforçar `DeliverabilityDashboard.tsx`:
- Adicionar trend chart (últimos 6 meses, bounce/complaint/unsub por mês)
- Score de deliverability agregado (0-100)
- Engagement decay: % de contactos sem abertura nos últimos 30/60/90 dias
- Health por segmento (query por segment_id → aggregate bounce/complaint rates)
- Alertas mais granulares com sugestões accionáveis

Criar `src/hooks/useEngagementSegments.ts`:
- Segmentos pré-definidos baseados em comportamento:
  - `engaged_7d`, `engaged_30d`, `engaged_90d`
  - `never_opened`, `opened_not_clicked`, `multi_clicker`
  - `bounced`, `complained`, `unsubscribed`
  - `cold_90d` (sem abertura há 90+ dias)
- Cada segmento com contagem e lógica de query

Criar `src/components/marketing/EngagementSegmentsPanel.tsx`:
- Lista de segmentos comportamentais com contagem
- Botão "Usar como segmento" para criar campanha filtrada
- Preview de contactos por segmento

---

**B5 — Dashboard Estratégico + Lifecycle Hooks**

Reforçar `MarketingDashboard.tsx`:
- Nova secção "Impacto Comercial":
  - Leads gerados (total e por campanha top-5)
  - Opps influenciadas
  - Revenue atribuída / influenciada
  - Campanha com melhor ROI
- Nova secção "Saúde da Base":
  - Integrar `DeliverabilityDashboard` inline
  - Engagement segments summary
- Gráfico funil: Campanhas → Leads → Opps → Revenue

Reforçar `TriggerBuilder.tsx`:
- Adicionar acções:
  - `update_score`: aumentar/diminuir lead/contact score
  - `create_task`: criar tarefa comercial
  - `update_lifecycle`: mudar lifecycle stage
- Adicionar evento `converted` (contacto gerou opp após campanha)

Criar `src/utils/campaignLifecycleScoring.ts`:
- Função que calcula impacto no score do contacto baseado em eventos de campanha
- opened = +2, clicked = +5, multi_click = +10, bounced = -10, complained = -20, unsubscribed = -15, converted = +25

---

### Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|----------|-------|
| `supabase/migrations/...` | Criar — contact_id/lead_id em marketing_events + campaign_attribution |
| `supabase/functions/marketing-webhook/index.ts` | Alterar — resolver contact_id/lead_id |
| `supabase/functions/compute-campaign-attribution/index.ts` | Criar — motor de attribution |
| `src/types/marketing.ts` | Alterar — novos tipos |
| `src/hooks/useContactCampaignHistory.ts` | Criar |
| `src/hooks/useCampaignAttribution.ts` | Criar |
| `src/hooks/useEngagementSegments.ts` | Criar |
| `src/components/contacts/sections/ContactCampaignHistory.tsx` | Criar |
| `src/components/marketing/EngagementSegmentsPanel.tsx` | Criar |
| `src/components/marketing/RevenueAttributionPanel.tsx` | Alterar — usar campaign_attribution |
| `src/components/marketing/DeliverabilityDashboard.tsx` | Alterar — trends + score + decay |
| `src/components/marketing/MarketingDashboard.tsx` | Alterar — secções estratégicas |
| `src/components/marketing/CampaignDetailDialog.tsx` | Alterar — tab impacto comercial |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Alterar — secção marketing |
| `src/components/marketing/TriggerBuilder.tsx` | Alterar — novas acções |
| `src/utils/campaignLifecycleScoring.ts` | Criar |

### O Que Fica para V2

- A/B testing avançado
- Optimização de subject/send time por IA
- Lifecycle sequences automáticas (onboarding, win-back, nurture)
- Permissões granulares por papel (RBAC dedicado ao módulo marketing)
- Segmentação comportamental cross-module (funis + campanhas + CRM)

### Critérios de Conclusão P1

- ✅ `marketing_events` liga a contact_id e lead_id
- ✅ Ficha do contacto mostra histórico de campanhas
- ✅ Tabela `campaign_attribution` com first/last/equal share
- ✅ Revenue attributed vs influenced por campanha
- ✅ Dashboard com leads, opps e revenue
- ✅ Deliverability com trends e engagement decay
- ✅ Segmentos comportamentais prontos a usar
- ✅ Triggers alimentam scoring e lifecycle

