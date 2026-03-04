

# Plano: Sistema de Afiliados e Referenciação para Marketplace C2C

## Contexto

O Marketplace C2C já possui infraestrutura completa: `c2c_sellers`, `c2c_listings`, `c2c_commissions`, `c2c_offers`, `c2c_reviews`, `c2c_messages`, `c2c_notifications`, `c2c_reports`, `c2c_sponsored_listings`, `c2c_categories`. O que falta é o sistema de **afiliados**, **referenciação** e **payouts**.

---

## 1. Base de Dados (1 migração)

### Novas tabelas

| Tabela | Finalidade |
|---|---|
| `c2c_affiliate_programs` | Configuração do programa de afiliados por workspace |
| `c2c_affiliates` | Utilizadores inscritos como afiliados |
| `c2c_affiliate_links` | Links gerados por afiliado (listing, seller, home) |
| `c2c_affiliate_clicks` | Tracking de cliques com fingerprint/ip hash |
| `c2c_affiliate_attributions` | Atribuição de comissão por venda |
| `c2c_referral_programs` | Configuração do programa de referenciação por workspace |
| `c2c_referrals` | Convites enviados (código/email) |
| `c2c_referral_attributions` | Recompensas por referenciação qualificada |
| `c2c_payouts` | Pagamentos a afiliados/sellers/referrers |
| `c2c_order_events` | Auditoria de eventos por order (existing c2c_commissions serves as orders) |
| `c2c_platform_fees` | Configuração de taxas da plataforma |

Todas com `workspace_id` (NOT NULL, FK workspaces), RLS multi-tenant, e indexes.

### RLS

- Afiliados: vêem apenas os seus dados (`user_id = auth.uid()`)
- Clicks: insert público (anon/authenticated), select só afiliado dono ou admin
- Attributions/Payouts: select por user_id, manage por admin workspace
- Programs/Fees: select por workspace members, manage por admin/owner

---

## 2. Edge Functions (4)

### A) `marketplace-track-click`
- Input: `affiliate_code` ou `referral_code`, `target_type`, `target_id`, `user_agent`, `referrer_url`
- Grava `c2c_affiliate_clicks` com `ip_hash`, `user_agent_hash`, `session_id`
- Retorna redirect URL + session_id (cookie)
- `verify_jwt = false` (público)

### B) `marketplace-attribute-sale`
- Chamada pelo webhook de pagamento (c2c-webhook) quando `c2c_purchase` é pago
- Verifica cookie_window (affiliate) e referral trigger
- Anti-fraude: bloqueia self-referral/self-affiliate
- Cria `c2c_affiliate_attributions` (status=held, hold_until=now+hold_days)
- Cria `c2c_referral_attributions` se aplicável
- Cria `c2c_order_events` (event_type=attributed)

### C) `marketplace-process-payouts`
- Cron ou manual: processa attributions com `hold_until < now()` e `status=held` → approved
- Agrega por user_id + período → cria `c2c_payouts` (status=queued)
- Se refund/chargeback detectado → reverte attributions

### D) `marketplace-payout-execute`
- Para payouts queued: marca como processing/paid (manual tracking)
- Exporta relatório CSV para pagamento IBAN

---

## 3. UI — Novas Páginas

### A) Centro de Afiliados (`/dashboard/c2c/affiliates`)
- Inscrição como afiliado (se programa ativo)
- Gerar links/códigos por listing ou geral
- Dashboard: cliques, conversões, comissões (pending/held/approved/paid)
- Tabela de histórico com export CSV

### B) Centro de Referências (`/dashboard/c2c/referrals`)
- Gerar link/código de convite
- Enviar convite por email (campo)
- Estado dos convites (invited/signed_up/qualified/rewarded)
- Recompensas acumuladas

### C) Admin Afiliados & Referências (`/dashboard/c2c/affiliate-admin`)
- Configurar programa afiliados (comissão %, cookie window, hold days)
- Configurar programa referências (reward type/value, trigger)
- Lista de afiliados + stats
- Lista de payouts + aprovar/rejeitar
- Anti-fraude: top IPs, self-referrals detectados

---

## 4. Navegação

Adicionar ao grupo "Marketplace C2C" em `nav.v1.ts` e `nav.v2.ts`:
- "Afiliados" → `/dashboard/c2c/affiliates`
- "Referências" → `/dashboard/c2c/referrals`
- "Admin Afiliados" → `/dashboard/c2c/affiliate-admin`

---

## 5. Integração com c2c-webhook existente

No `c2c-webhook/index.ts`, no bloco `c2c_purchase`, adicionar chamada a `marketplace-attribute-sale` para processar atribuições de afiliado/referência automaticamente após pagamento.

---

## 6. Ficheiros a criar/modificar

| Ficheiro | Ação |
|---|---|
| Migração SQL | Criar 11 tabelas + RLS + indexes |
| `supabase/functions/marketplace-track-click/index.ts` | Criar |
| `supabase/functions/marketplace-attribute-sale/index.ts` | Criar |
| `supabase/functions/marketplace-process-payouts/index.ts` | Criar |
| `supabase/functions/marketplace-payout-execute/index.ts` | Criar |
| `src/hooks/useC2CAffiliates.ts` | Hooks para affiliate CRUD + stats |
| `src/hooks/useC2CReferrals.ts` | Hooks para referral CRUD + stats |
| `src/hooks/useC2CPayouts.ts` | Hooks para payouts admin |
| `src/pages/c2c/C2CAffiliateCenter.tsx` | Página afiliados |
| `src/pages/c2c/C2CReferralCenter.tsx` | Página referências |
| `src/pages/c2c/C2CAffiliateAdmin.tsx` | Página admin |
| `src/App.tsx` | Registar 3 novas rotas |
| `src/config/nav.v1.ts` | Adicionar 3 itens menu |
| `src/config/nav.v2.ts` | Adicionar 3 children |
| `supabase/functions/c2c-webhook/index.ts` | Integrar atribuição |

