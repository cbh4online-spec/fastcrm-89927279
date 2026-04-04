
# Plano: Sistema de Afiliados Transversal

## Visão Geral

Criar um motor de afiliados completo que permita a qualquer pessoa registar-se como afiliado, partilhar links de referência e ganhar comissões sobre vendas geradas em **todos os módulos** (Loja, Marketplace, Subscrições SaaS, módulos futuros).

---

## Arquitectura de Dados (12 tabelas)

### Tabelas Core

| Tabela | Função |
|---|---|
| `affiliate_programs` | Programas configuráveis por workspace (ex: "Programa Loja", "Programa SaaS"). Cada programa tem nome, comissão default (% ou valor fixo), cookie duration, min payout, status |
| `affiliate_program_tiers` | Tiers multinível por programa (ex: Bronze 10%, Silver 15%, Gold 20%). Threshold de volume para upgrade automático |
| `affiliate_program_rules` | Regras de comissão por módulo/produto/categoria. Permite override granular da comissão default do programa |
| `affiliates` | Registo de afiliados. Campos: user_id (nullable para guests), email, name, status (pending/active/suspended/rejected), affiliate_code (único), parent_affiliate_id (para multinível), current_tier_id, workspace_id |
| `affiliate_links` | Links de tracking gerados. Campos: affiliate_id, url, campaign_name, utm_params, click_count |
| `affiliate_clicks` | Log de cliques com IP, user_agent, referrer, landing_page, timestamp |
| `affiliate_conversions` | Conversões rastreadas. Campos: affiliate_id, order_id (nullable), subscription_id (nullable), source_module (store/marketplace/saas), gross_amount, commission_amount, commission_rate, status (pending/approved/rejected/paid), level (1 ou 2 para multinível) |
| `affiliate_balances` | Saldo actual do afiliado (earned, pending, paid, available) |
| `affiliate_payouts` | Histórico de pagamentos. Campos: affiliate_id, amount, method (stripe/manual/credit), status (pending/processing/completed/failed), processed_by, stripe_payout_id |
| `affiliate_payout_methods` | Métodos de pagamento configurados pelo afiliado (IBAN, PayPal, Stripe Connect account) |
| `affiliate_notifications` | Notificações ao afiliado (nova venda, payout processado, tier upgrade) |
| `affiliate_settings` | Configurações globais por workspace (auto-approve, cookie days, min payout threshold, terms & conditions URL) |

### RLS
- Todas as tabelas escopadas por `workspace_id`
- Afiliados só vêem os seus próprios dados (affiliate_id = current user)
- Admin do workspace vê tudo do workspace
- Payouts: INSERT/UPDATE apenas via service_role (Edge Functions)

---

## Módulos Frontend

### 1. Portal do Afiliado (público/autenticado)
- **Página de registo** (`/affiliate/register`) — formulário público self-service
- **Dashboard do afiliado** (`/affiliate/dashboard`) — KPIs, gráficos, links, conversões, saldo, payouts
- **Gerador de links** — criar links com UTMs customizados por produto/página
- **Histórico de conversões** — tabela filtável com status
- **Métodos de pagamento** — configurar IBAN/PayPal/Stripe para receber
- **Materiais** — banners, textos, recursos de marketing (fase futura)

### 2. Admin de Afiliados (dashboard interno)
- **Gestão de programas** — CRUD de programas, tiers e regras de comissão
- **Lista de afiliados** — aprovar/rejeitar/suspender, ver performance
- **Conversões** — aprovar/rejeitar conversões pendentes
- **Payouts** — processar pagamentos, ver histórico
- **Analytics** — top afiliados, receita gerada, ROI por programa
- **Configurações** — cookie duration, auto-approve, min payout, T&C

### 3. Tracking Engine (Edge Functions)
- **`affiliate-track-click`** — regista clique, define cookie (30 dias default)
- **`affiliate-register-conversion`** — chamado internamente pelo checkout da loja, marketplace e subscrições. Calcula comissão com base nas regras do programa, aplica multinível (nível 2 = % da comissão do nível 1)
- **`affiliate-process-payout`** — processa payouts manuais ou automáticos via Stripe

### 4. Integração nos Módulos Existentes
- **Store Checkout** (`create-store-checkout`) — ao finalizar compra, verificar cookie de afiliado e chamar `affiliate-register-conversion`
- **Marketplace Orders** — mesma lógica para vendas C2C
- **Subscrições SaaS** — comissão recorrente no primeiro pagamento ou em todas as renovações (configurável)

---

## Fases de Implementação

### Fase 1 — Infraestrutura (este plano)
1. Migração DB: criar as 12 tabelas + RLS + triggers
2. Hook `useAffiliatePrograms` + `useAffiliates` + `useAffiliateConversions`
3. Portal do afiliado: registo + dashboard + links
4. Admin: gestão de programas + afiliados + conversões
5. Edge Function `affiliate-track-click` + tracking via cookie
6. Edge Function `affiliate-register-conversion`
7. Integração no checkout da loja

### Fase 2 — Expansão (futuro)
- Payouts automáticos via Stripe Connect
- Integração Marketplace + SaaS
- Materiais de marketing
- Relatórios avançados

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|---|---|
| `supabase/migrations/...` | Criar 12 tabelas + RLS + triggers |
| `src/hooks/useAffiliates.ts` | Hook CRUD para afiliados |
| `src/hooks/useAffiliatePrograms.ts` | Hook CRUD para programas e regras |
| `src/hooks/useAffiliateConversions.ts` | Hook para conversões e payouts |
| `src/hooks/useAffiliateTracking.ts` | Hook de tracking (cookie read/write) |
| `src/pages/AffiliateRegisterPage.tsx` | Página pública de registo |
| `src/pages/AffiliateDashboardPage.tsx` | Dashboard do afiliado |
| `src/pages/AffiliateAdminPage.tsx` | Admin de afiliados (workspace) |
| `src/components/affiliates/...` | Componentes UI (tabs, cards, tabelas) |
| `supabase/functions/affiliate-track-click/index.ts` | Edge Function tracking |
| `supabase/functions/affiliate-register-conversion/index.ts` | Edge Function conversões |
| `src/routes/...` | Adicionar rotas de afiliados |

---

## Critérios de Aceitação

- [ ] Qualquer pessoa pode registar-se como afiliado via portal público
- [ ] Afiliado recebe código único e pode gerar links personalizados
- [ ] Cliques em links são rastreados com cookie de 30 dias
- [ ] Conversões registadas automaticamente no checkout
- [ ] Comissão calculada com base nas regras do programa (% ou fixo)
- [ ] Multinível: afiliado de nível 2 recebe % configurável
- [ ] Admin pode aprovar/rejeitar afiliados e conversões
- [ ] Saldos calculados correctamente (pending vs available)
- [ ] Dashboard do afiliado com KPIs e histórico
- [ ] RLS garante isolamento total de dados entre workspaces e afiliados
