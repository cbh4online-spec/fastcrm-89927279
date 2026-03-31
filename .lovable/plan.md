

## Diagnóstico: P0 já está implementado

Após revisão completa do código actual, **todos os itens P0 que pedes já foram implementados** no batch anterior. Aqui está a confirmação item a item:

### P0.1 — Formulários Robustos ✅ Já existe

| Requisito | Estado | Ficheiro |
|-----------|--------|----------|
| react-hook-form + zod + @hookform/resolvers | ✅ | `FunnelStepForm.tsx` L1-4 |
| Schema dinâmico por step | ✅ | `buildSchema()` L37-81 |
| Validação email, phone, required | ✅ | L58-68 |
| Select real (shadcn) | ✅ | L246-268 |
| Checkbox, Radio, Consent, Marketing opt-in | ✅ | L165-243 |
| Hidden fields | ✅ | L159-161 |
| Honeypot anti-spam | ✅ | L77-78, L153-156 |
| Erro por campo | ✅ | Cada campo tem `{error && <p>...}` |
| Estados idle/submitting/success/error | ✅ | L111, L134, L341-343 |
| Editor com tipos + opções para select/radio | ✅ | `FunnelStepEditor.tsx` L612-680 |

### P0.2 — Consentimento e Compliance ✅ Já existe

| Requisito | Estado | Ficheiro |
|-----------|--------|----------|
| consent_required, consent_text, privacy_policy_url | ✅ | Schema migração + `FunnelSettingsTab.tsx` L39-44 |
| Checkbox obrigatório no form | ✅ | `FunnelStepForm.tsx` L144, L306-324 |
| Marketing opt-in opcional | ✅ | L328-339 |
| Guardar consent_given, consent_timestamp, marketing_opt_in | ✅ | `PublicFunnelPage.tsx` L163-180 |
| UTMs, referrer, device_type, session_id | ✅ | L163-180 |
| Configuração no editor | ✅ | `FunnelSettingsTab.tsx` L39-97 |

### P0.3 — CRM Loop ✅ Já existe

| Requisito | Estado | Ficheiro |
|-----------|--------|----------|
| Edge Function funnel-lead-capture | ✅ | `supabase/functions/funnel-lead-capture/index.ts` |
| Lookup contacto por email | ✅ | L45-50 |
| Criar se não existir | ✅ | L77-100 |
| Atualizar se existir | ✅ | L62-75 |
| Tags (funnel:slug, step:type, campaign:utm) | ✅ | L56-60 |
| Activity logs (lead_captured, contact_created) | ✅ | L112-139 |
| Invocação após submit | ✅ | `PublicFunnelPage.tsx` L202-223 |

### P0.4 — Tracking ✅ Já existe

| Requisito | Estado | Ficheiro |
|-----------|--------|----------|
| Tabela funnel_events | ✅ | Migração aplicada |
| step_view (dedup por sessão) | ✅ | `useFunnelTracking.ts` L69-76 |
| form_started | ✅ | L78-81 |
| form_submit_success/failed | ✅ | L83-92 |
| cta_clicked | ✅ | L94-98 |
| step_completed, funnel_completed | ✅ | L100-108 |
| session_id anónimo | ✅ | L6-14 |
| contact_id quando identificado | ✅ | L110-112 |
| device_type, referrer, UTMs | ✅ | L42-64 |

### P0.5 — SEO ✅ Já existe

| Requisito | Estado | Ficheiro |
|-----------|--------|----------|
| seo_title, seo_description, og_image_url, canonical_url, noindex | ✅ | Schema + `FunnelSettingsTab.tsx` |
| react-helmet-async no funil público | ✅ | `PublicFunnelPage.tsx` L292-300 |

### P1 — Analytics + Preflight ✅ Já existe

| Requisito | Estado |
|-----------|--------|
| Dashboard 3 secções (Consumo, Captação, Conversão) | ✅ `FunnelAnalyticsTab.tsx` |
| Funil de conversão visual | ✅ L237-263 |
| KPIs hook (useFunnelConversionKPIs) | ✅ |
| Preflight check (funnelPreflight.ts) | ✅ |
| FunnelPreflightDialog | ✅ |

---

### Conclusão

**Não há código a escrever para P0.** Toda a base operacional — formulários com zod, consentimento RGPD, CRM via edge function, tracking granular com 8 event types, SEO com Helmet, analytics em 3 secções e preflight — já está implementada e funcional.

### O que falta para P1/P2 (ainda não implementado):

| Item | Prioridade |
|------|-----------|
| `step_abandoned` (via beforeunload) | P1 |
| Ranking de CTAs na tab Conversão | P1 |
| Conversão por origem/UTM (breakdown) | P1 |
| Runtime diferenciado por step_type (booking, countdown, bridge, etc.) | P1 |
| A/B testing | P2 |
| Scoring por comportamento | P2 |
| Segmentação | P2 |
| Permissões granulares | P2 |

### Recomendação

Se quiseres avançar, posso implementar os itens P1 em falta (step_abandoned, ranking CTA, breakdown por UTM e runtime por step_type). Caso contrário, recomendo **testar o fluxo completo** num funil real para validar que tudo funciona de ponta a ponta antes de avançar.

