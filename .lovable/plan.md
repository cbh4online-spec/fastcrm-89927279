

# Renewals Engine — 3 Camadas (Análise e Plano)

## Estado Atual

A Camada 1 está **80% completa**. Já existem:
- 4 tabelas DB com RLS + enums + índices
- Types, hooks (CRUD completo), pages (lista + detalhe com 5 tabs)
- Navegação integrada em nav.v1/v2
- Dialogs de criação (contrato, item, consumo)
- Edge functions `renewals-scheduler` e `renewals-health-score` (código existe, mas **não registadas** no `config.toml`)

## O Que Falta

### Camada 1 — Completar

1. **Trigger `total_mrr` automático** — criar trigger SQL que recalcula `total_mrr` no contrato quando items são inseridos/atualizados/removidos
2. **Integração "Propostas Ganhas"** — quando proposta `status=accepted`, mostrar CTA "Criar contrato de renovação" que copia itens relevantes (domain/license/hours_pack/retainer) para um novo renewal_contract
3. **Registar config.toml** — adicionar `renewals-scheduler` e `renewals-health-score` ao `config.toml` com `verify_jwt = false`

### Camada 2 — Cron + Alertas

4. **Melhorar `renewals-scheduler`** — além de criar `renewal_events`, inserir `admin_notifications` para que alertas apareçam no sino de notificações existente
5. **Painel "Renewals Alerts"** — nova secção na página de Renovações com cards: Overdue, Próximos 7 dias, Packs baixos (<20%), Expirações próximas (15 dias)
6. **Usage thresholds no scheduler** — verificar `hours_remaining` em packs e `expiry_date` para disparar alertas automáticos

### Camada 3 — IA

7. **Migração: adicionar `risk_level` e `reasons_json`** em `renewal_contracts`
8. **Edge function `renewals-ai-suggestions`** — usa Lovable AI (Gemini 3 Flash) para gerar sugestões acionáveis (upsell, risk_mitigation, downgrade) baseadas em dados reais do contrato
9. **Melhorar `renewals-health-score`** — calcular score + top 3 reasons + suggested_next_action, gravar em `reasons_json`
10. **UI de Health Score e Sugestões IA** — mostrar risk_level, reasons e sugestões com CTAs no detalhe do contrato

## Ficheiros a Criar/Editar

| Ficheiro | Ação |
|----------|------|
| Migration SQL (trigger MRR + campos risk_level/reasons_json) | Criar |
| `supabase/config.toml` | Editar (registar 3 edge functions) |
| `supabase/functions/renewals-scheduler/index.ts` | Editar (adicionar admin_notifications + usage thresholds) |
| `supabase/functions/renewals-health-score/index.ts` | Editar (adicionar reasons_json + risk_level) |
| `supabase/functions/renewals-ai-suggestions/index.ts` | Criar |
| `src/pages/RenewalsPage.tsx` | Editar (adicionar painel de alertas) |
| `src/pages/RenewalDetailPage.tsx` | Editar (mostrar risk_level, reasons, sugestões IA) |
| `src/hooks/useRenewals.ts` | Editar (adicionar hook para sugestões IA) |
| `src/components/renewals/RenewalAlerts.tsx` | Criar (painel de alertas) |
| `src/components/renewals/RenewalAISuggestions.tsx` | Criar (sugestões IA com CTAs) |
| `src/components/proposals/ProposalToRenewalCTA.tsx` | Criar (CTA para criar contrato a partir de proposta ganha) |
| `src/types/renewal.ts` | Editar (adicionar risk_level, reasons types) |

## Ordem de Implementação

**Bloco 1** (Camada 1): Migration trigger MRR + config.toml + integração propostas ganhas
**Bloco 2** (Camada 2): Scheduler melhorado com notifications + painel alertas
**Bloco 3** (Camada 3): Migration risk fields + health score melhorado + AI suggestions edge function + UI

