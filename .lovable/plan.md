

## Funis Comerciais Maduros — Plano de Implementação

### Diagnóstico

| Área | Estado | Lacuna |
|------|--------|--------|
| Formulários públicos | useState manual, sem validação, select renderiza como `<Input>` | Sem zod, sem react-hook-form, sem campo select real, sem checkbox/radio/consent |
| Consentimento | Inexistente | Sem campos, sem UI, sem registo |
| CRM loop | Inexistente — submit só insere em `funnel_submissions` | Não cria contacto, não aplica tags, não regista origem |
| Tracking | Apenas `page_view` e `optin` via `funnel_step_stats` (agregado diário) | Sem eventos granulares, sem sessão, sem device, sem UTM, sem CTA tracking |
| SEO | Inexistente | Sem meta tags, sem og:image, sem noindex |
| Analytics | Agregação por step_stats, sem funil de conversão, sem captação | Sem secções separadas, sem funil visual |
| Preflight | Inexistente | Publicação directa sem validação |
| Anti-spam | Inexistente | Sem honeypot, sem rate limit |

### Priorização V1 (P0+P1) vs V2 (P2)

**V1 — 6 Batches:**

| Batch | Conteúdo |
|-------|----------|
| B1 | Schema: campos SEO+consent em `funnels`, campos compliance em `funnel_submissions`, tabela `funnel_events` |
| B2 | Formulários robustos: react-hook-form + zod, select real, consent/marketing_opt_in, honeypot |
| B3 | Edge Function `funnel-lead-capture`: CRM create/update, tags, kernel events |
| B4 | Tracking granular: `funnel_events` com step_view, form_started, form_submit, cta_click, step_completed |
| B5 | Analytics 3 secções (Consumo, Captação, Conversão) + funil visual + SEO no leitor público |
| B6 | Preflight check antes de publicar |

**V2 — Diferido:**
- Scoring por comportamento
- Segmentação avançada
- A/B testing
- Permissões granulares por módulo
- Turnstile / challenge anti-bot

---

### B1 — Migração de Schema

**Campos novos na tabela `funnels`:**
```
seo_title             TEXT
seo_description       TEXT
og_image_url          TEXT
canonical_url         TEXT
noindex               BOOLEAN DEFAULT false
consent_required      BOOLEAN DEFAULT false
consent_text          TEXT
consent_text_version  TEXT
privacy_policy_url    TEXT
marketing_opt_in_enabled  BOOLEAN DEFAULT false
marketing_opt_in_label    TEXT
```

**Campos novos na tabela `funnel_submissions`:**
```
contact_id            UUID (nullable, FK → contacts)
consent_given         BOOLEAN DEFAULT false
consent_timestamp     TIMESTAMPTZ
consent_text_version  TEXT
marketing_opt_in      BOOLEAN DEFAULT false
utm_source            TEXT
utm_medium            TEXT
utm_campaign          TEXT
referrer              TEXT
device_type           TEXT
session_id            TEXT
```

**Tabela nova `funnel_events`:**
```
id              UUID PK
workspace_id    UUID FK → workspaces
funnel_id       UUID FK → funnels
step_id         UUID (nullable) FK → funnel_steps
contact_id      UUID (nullable)
session_id      TEXT
event_type      TEXT NOT NULL
event_value     TEXT
device_type     TEXT
referrer        TEXT
utm_source      TEXT
utm_medium      TEXT
utm_campaign    TEXT
metadata        JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ DEFAULT now()
```

**RLS:**
- `funnel_events`: anon/authenticated INSERT com `WITH CHECK (true)`; SELECT para membros do workspace
- `funnel_submissions`: adicionar campos sem alterar políticas existentes

---

### B2 — Formulários Robustos

**Refactoring do `PublicFunnelPage.tsx`:**

Extrair formulário para componente dedicado `FunnelStepForm.tsx`:
- Usar `react-hook-form` + `@hookform/resolvers/zod`
- Schema zod dinâmico gerado a partir de `form_fields[]`
- Campo `select` com `<Select>` real (shadcn)
- Campo `checkbox` e `radio` com componentes reais
- Campos especiais: `consent` (checkbox obrigatório se `consent_required`), `marketing_opt_in`
- Honeypot field invisível (anti-spam básico)
- Estados: idle → submitting → success → error
- Validação email com regex, phone com padrão internacional
- Erros por campo inline

**Tipos de campo suportados no runtime:**
text, email, phone, textarea, select, checkbox, radio, hidden, consent, marketing_opt_in

**Editor (`FunnelStepEditor.tsx`):**
- Adicionar tipos checkbox, radio, consent, marketing_opt_in, hidden ao select de tipo
- Quando tipo=select, mostrar editor de opções (já existe `options[]` no interface mas não tem UI de edição)

---

### B3 — Edge Function `funnel-lead-capture`

Baseada no padrão `ebook-lead-capture`:

```
Input: workspace_id, funnel_id, step_id, name, email, consent_given,
       marketing_opt_in, utm_source, utm_medium, utm_campaign, slug,
       step_type, form_data

Lógica:
1. Lookup contacto por email no workspace
2. Se existe → update tags, updated_at
3. Se não existe → create (name, email, source="funnel", lead_source="funnel")
4. Aplicar tags: funnel:<slug>, step:<step_type>
5. Se utm_campaign → tag campaign:<utm_campaign>
6. Se marketing_opt_in → tag marketing_opt_in
7. Update funnel_submissions.contact_id
8. Update ebook_views referência (se aplicável)
9. Insert activity_logs: funnel.lead_captured
10. Se contacto novo → activity_logs: funnel.contact_created
11. Se contacto existente → activity_logs: funnel.contact_matched
12. Retornar { contact_id, is_new }
```

**Alteração no `PublicFunnelPage.tsx`:**
- Após submit do formulário, invocar `funnel-lead-capture`
- Gravar `contact_id` retornado para tracking subsequente

---

### B4 — Tracking Granular

**Criar `useFunnelTracking.ts`:**

Hook que gere sessão anónima (`sessionStorage`) e envia eventos para `funnel_events`:

Eventos:
- `step_view` — ao entrar no step (dedup por sessão)
- `form_started` — ao focar primeiro campo do form
- `form_submit_success` — após submit com sucesso
- `form_submit_failed` — após submit com erro
- `cta_clicked` — ao clicar CTA (externo ou navegação)
- `step_completed` — ao sair do step com sucesso
- `funnel_completed` — ao completar último step
- `step_abandoned` — via `beforeunload` ou navegação para fora

Metadata automática: device_type, referrer, UTMs (do URL), session_id.

**Integração no `PublicFunnelPage.tsx`:**
- Substituir tracking actual (`funnel_step_stats.insert`) pelo novo hook
- Manter compatibilidade com `funnel_step_stats` para analytics existentes (write dual)

---

### B5 — SEO + Analytics

**SEO no leitor público:**
- Instalar `react-helmet-async` (já no projecto para ebooks)
- No `PublicFunnelPage`, injectar `<Helmet>` com title, meta description, og:tags, canonical, robots
- Fallback: usar `funnel.name` se SEO fields estiverem vazios

**Editor de SEO:**
- Adicionar secção "SEO" no `FunnelSettingsTab.tsx`: seo_title, seo_description, og_image_url, canonical_url, noindex

**Analytics — Reestruturar `FunnelAnalyticsTab.tsx` em 3 secções:**

1. **Consumo**: views por step, unique visitors, tempo (do tracking existente), drop-off
2. **Captação**: leads captados, consentimentos, opt-in marketing, contactos criados vs existentes, lead gate rate
3. **Conversão**: CTA clicks, CTR por step, funil visual (views → leads → consentidos → CRM → CTA clicks)

**Novo hook `useFunnelConversionKPIs.ts`:**
- Query `funnel_events` agrupado por event_type
- Query `funnel_submissions` com contact_id para métricas CRM
- Cálculos de taxas

---

### B6 — Preflight Check

**Criar `src/utils/funnelPreflight.ts`:**

Validações bloqueantes:
- slug vazio ou inválido
- 0 steps
- step com form_fields vazio em optin/squeeze/application
- consent_required=true sem consent_text
- consent_required=true sem privacy_policy_url
- CTA activo sem URL válido

Validações warning:
- sem SEO configurado
- steps sem conteúdo (headline vazio)
- sem capa/og_image
- form fields sem validação adequada

**Criar `FunnelPreflightDialog.tsx`:**
- Lista de ✅ / ❌ / ⚠️
- Score de completude
- Bloqueia publish se erros críticos
- Permite publish com warnings (com confirmação)

**Integrar no `FunnelSettingsTab.tsx`:**
- Botão "Verificar antes de publicar" antes do toggle is_published

---

### Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|----------|-------|
| `supabase/migrations/...` | Criar — schema B1 |
| `supabase/functions/funnel-lead-capture/index.ts` | Criar — CRM integration |
| `src/components/funnels/FunnelStepForm.tsx` | Criar — formulário robusto com zod |
| `src/hooks/useFunnelTracking.ts` | Criar — tracking granular |
| `src/hooks/useFunnelConversionKPIs.ts` | Criar — métricas de conversão |
| `src/utils/funnelPreflight.ts` | Criar — validação pré-publicação |
| `src/components/funnels/FunnelPreflightDialog.tsx` | Criar — UI do preflight |
| `src/pages/PublicFunnelPage.tsx` | Alterar — formulário extraído, SEO, tracking, lead-capture |
| `src/components/funnels/FunnelStepEditor.tsx` | Alterar — novos tipos de campo, opções de select |
| `src/components/funnels/tabs/FunnelAnalyticsTab.tsx` | Alterar — 3 secções + funil visual |
| `src/components/funnels/tabs/FunnelSettingsTab.tsx` | Alterar — SEO + consent + preflight |
| `src/hooks/useFunnels.ts` | Alterar — expandir tipo Funnel com novos campos |

---

### Confirmação V1

Após implementação:
- ✅ Formulários robustos com zod + react-hook-form
- ✅ Select correctamente implementado
- ✅ Consentimento e compliance (consent_required, RGPD checkboxes)
- ✅ Criação/atualização de contacto no CRM via edge function
- ✅ Tracking de step e conversão (10 event types)
- ✅ CTA tracking (cta_clicked)
- ✅ SEO público do funil (meta tags, OG, canonical)
- ✅ Analytics 3 secções com funil visual
- ✅ Preflight antes de publicar
- ✅ Honeypot anti-spam básico
- ⏳ Scoring por comportamento (V2)
- ⏳ Permissões granulares (V2)
- ⏳ A/B testing (V2)

