

## Evolução do Módulo de Campanhas de Email — Plano V1

### Diagnóstico

| Área | Estado | Lacuna |
|------|--------|--------|
| design_json | Coluna existe na BD, mas **não é gravada** na criação (comentário "will be saved via separate update") nem lida para reabrir o editor | Perda estrutural ao reabrir |
| Estados editoriais | 6 estados: draft/scheduled/sending/sent/paused/cancelled | Faltam in_review, ready_to_send, failed |
| Preflight | `CampaignValidationPanel` valida apenas lista de destinatários (sintaxe+MX) | Não valida subject, body, links, unsubscribe, design_json |
| Test send | Inexistente | Sem fluxo formal de teste |
| Aprovação | Inexistente | Sem reviewed_at/by, approved_at/by, comentários |
| Attribution | `RevenueAttributionPanel` existe mas liga clicks→opp de forma simples | Falta source_campaign_id no contacto, timeline, attribution formal |
| Deliverability dashboard | `DeliverabilityPanel` calcula sender score por campanha individual | Falta visão agregada (bounce rate global, complaint rate, saúde da base) |
| design_json no create | `useCreateCampaign` não aceita `designJson` | Não persiste o design |
| design_json no update | `useUpdateCampaign` não aceita `designJson` | Idem |

### Plano de Execução — 6 Batches

---

**B1 — Schema: estados, aprovação e design_json persistente**

Migração SQL:
- Adicionar `reviewed_at TIMESTAMPTZ`, `reviewed_by UUID`, `approved_at TIMESTAMPTZ`, `approved_by UUID`, `rejection_reason TEXT`, `test_sent_at TIMESTAMPTZ`, `test_sent_by UUID` a `marketing_campaigns`
- Não alterar `status` para enum (manter string para flexibilidade), mas a aplicação passa a reconhecer: `draft`, `in_review`, `ready_to_send`, `scheduled`, `sending`, `sent`, `paused`, `cancelled`, `failed`

Código:
- `src/types/marketing.ts`: expandir `CampaignStatus` com novos valores, adicionar labels e cores, expandir `MarketingCampaign` com novos campos (`designJson`, `reviewedAt`, `reviewedBy`, `approvedAt`, `approvedBy`, `rejectionReason`, `testSentAt`, `testSentBy`)
- `src/hooks/useMarketingCampaigns.ts`: `mapCampaign` mapeia novos campos; `useCreateCampaign` aceita e grava `designJson`; `useUpdateCampaign` aceita e grava `designJson`
- `src/components/marketing/CampaignCreationFlow.tsx`: gravar `designJson: savedDesign.design` na criação

---

**B2 — Editor reabrível e design_json como fonte de verdade**

- `src/components/marketing/CampaignDetailDialog.tsx`: na tab "Conteúdo", se `campaign.designJson` existir, mostrar botão "Editar no editor visual" que abre `EmailBuilderDialog` com `initialDesign={campaign.designJson}`
- Ao guardar do editor, atualizar `designJson` + `bodyHtml` via `useUpdateCampaign`
- Se `designJson` não existir (campanhas legacy), manter apenas edição HTML

---

**B3 — Preflight Check completo**

Criar `src/utils/campaignPreflight.ts`:

Validações bloqueantes:
- subject vazio
- fromName vazio
- body_html vazio
- totalRecipients === 0
- replyTo inválido (quando preenchido)
- unsubscribe link ausente no body_html (busca por `{{unsubscribe}}` ou `/unsubscribe`)
- status !== 'draft' e status !== 'ready_to_send'

Validações warning:
- body_text vazio (fallback gerado)
- preview_text vazio
- design_json vazio (campanha sem layout estruturado)
- segmentId vazio (envio manual)
- links quebrados (HTTP check opcional)
- validação de lista não executada ou desactualizada (> 24h)

Criar `src/components/marketing/CampaignPreflightDialog.tsx`:
- Painel com checklist ✅/❌/⚠️
- Score de prontidão
- Bloqueia envio se erros críticos
- Botão "Marcar como pronta" (transição draft → ready_to_send)

Integrar no `CampaignDetailDialog.tsx`:
- Tab "Envio" mostra preflight antes do botão de enviar
- Substituir o fluxo actual (validação de lista → enviar) por (preflight → validação de lista → enviar)

---

**B4 — Test Send formal**

Criar `src/components/marketing/CampaignTestSendDialog.tsx`:
- Input para 1-5 emails de teste
- Botão "Enviar teste"
- Invoca edge function `marketing-send-campaign` com flag `test_only: true` e `test_recipients: [...]`

Alterar `supabase/functions/marketing-send-campaign/index.ts`:
- Aceitar `test_only` boolean e `test_recipients` array
- Se `test_only=true`, enviar apenas para os emails indicados sem alterar métricas, sem criar `marketing_recipients`, sem mudar status
- Registar `test_sent_at` e `test_sent_by` na campanha

Integrar no `CampaignDetailDialog.tsx`:
- Botão "Enviar teste" na tab Envio, após preflight passar

---

**B5 — Workflow de aprovação editorial**

Criar `src/components/marketing/CampaignApprovalPanel.tsx`:
- Mostrar estado editorial actual (draft → in_review → ready_to_send)
- Botão "Submeter para revisão" (draft → in_review)
- Botão "Aprovar" (in_review → ready_to_send) — grava approved_at/by
- Botão "Rejeitar" com motivo (in_review → draft) — grava rejection_reason
- Histórico de aprovação inline (quem, quando, motivo)

Regras de transição (no frontend):
- draft → in_review: qualquer editor
- in_review → ready_to_send: apenas reviewer/admin
- in_review → draft: rejeição com motivo
- ready_to_send → sending: apenas publisher/admin, após preflight
- sending → paused: pausa manual
- paused → sending: retoma
- sent → draft: duplicar campanha (não editar a original)

Integrar no `CampaignDetailDialog.tsx`:
- Novo panel de aprovação visível em todos os estados editoriais
- Badges de estado actualizados com novas cores

---

**B6 — Analytics reforçadas e deliverability agregada**

Criar `src/components/marketing/DeliverabilityDashboard.tsx`:
- Bounce rate agregado (todas as campanhas dos últimos 30d)
- Complaint rate agregado
- Unsubscribe rate agregado
- Suppression growth
- Alertas automáticos (bounce > 5%, complaint > 0.3%)
- Sugestões de acção (reengagement, limpeza)

Reforçar `RevenueAttributionPanel.tsx`:
- Adicionar coluna leads gerados por campanha (contacts created com source_campaign)
- Mostrar oportunidades influenciadas vs criadas

Alterar `CampaignDetailDialog.tsx` tab "Estatísticas":
- Adicionar secção "Impacto comercial" com leads gerados e oportunidades influenciadas (query marketing_events → contacts → opportunities)

---

### Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|----------|-------|
| `supabase/migrations/...` | Criar — novos campos |
| `src/types/marketing.ts` | Alterar — novos estados, novos campos |
| `src/hooks/useMarketingCampaigns.ts` | Alterar — mapear+aceitar novos campos |
| `src/components/marketing/CampaignCreationFlow.tsx` | Alterar — gravar designJson |
| `src/components/marketing/CampaignDetailDialog.tsx` | Alterar — preflight, test send, aprovação, editor reabrível |
| `src/utils/campaignPreflight.ts` | Criar — validação pré-envio |
| `src/components/marketing/CampaignPreflightDialog.tsx` | Criar — UI do preflight |
| `src/components/marketing/CampaignTestSendDialog.tsx` | Criar — test send |
| `src/components/marketing/CampaignApprovalPanel.tsx` | Criar — workflow aprovação |
| `src/components/marketing/DeliverabilityDashboard.tsx` | Criar — deliverability agregada |
| `supabase/functions/marketing-send-campaign/index.ts` | Alterar — test_only mode |

### V2 (Diferido)

- A/B testing (já tem base com `campaign_ab_tests`)
- Optimização por IA (subject, send time, spam risk)
- Lifecycle marketing (onboarding, win-back, nurture sequences)
- Permissões granulares por papel (RBAC dedicado ao módulo)
- Segmentação comportamental avançada

### Confirmação V1

Após implementação:
- ✅ design_json persistente e editor reabrível
- ✅ 9 estados editoriais (draft → failed)
- ✅ Preflight completo antes de enviar
- ✅ Test send formal sem contaminar métricas
- ✅ Workflow de aprovação (submeter, aprovar, rejeitar)
- ✅ Transições de estado controladas
- ✅ Deliverability agregada com alertas
- ✅ Attribution básica (leads + oportunidades por campanha)
- ⏳ A/B testing (V2)
- ⏳ IA para optimização (V2)
- ⏳ Lifecycle marketing (V2)

