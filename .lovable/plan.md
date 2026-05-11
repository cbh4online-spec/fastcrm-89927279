## Diagnóstico

Já existe a tabela `public.invoices` no CRM e a integração `workspace_billing_integrations` (InvoiceXpress) com proxy autenticado. Falta o elo: trazer faturas emitidas no InvoiceXpress para dentro do CRM, manter o estado em dia (rascunho, enviada, paga, vencida, anulada) e expor isso na UI de faturação do workspace, sem duplicar registos quando a fatura também é criada no CRM.

## Decisões de produto/UX

- Sincronização **pull-only** (InvoiceXpress → CRM) nesta fase. Emissão a partir do CRM fica para fase 2.
- Cada fatura sincronizada fica em `invoices` com `external_provider = 'invoicexpress'` e `external_id` único — sem duplicar quando já existe.
- Tipos suportados: `invoice`, `invoice_receipt`, `simplified_invoice`, `credit_note`. Outros são ignorados (fallback log).
- Mapeamento de estados InvoiceXpress → CRM:
  - `draft` → `draft`
  - `sent` → `sent`
  - `settled` / `paid` → `paid`
  - `canceled` → `cancelled`
  - se `due_date < hoje` e não pago → `overdue`
- Cliente: tenta fazer match por NIF (em `companies.tax_id`) e/ou email (`contacts.email`). Se não encontrar, grava em `client_*` snapshot e deixa `company_id`/`contact_id` nulos (utilizador resolve depois).
- Botão **"Sincronizar agora"** na página de Faturação API → Detalhes da integração (executa sync incremental dos últimos 30 dias).
- **Cron diário** automático (06:00 UTC) sincroniza últimos 7 dias de todas as integrações activas.
- Badge na lista de faturas: 🔗 InvoiceXpress + número original + link para abrir no IX.
- Página `/dashboard/settings/billing-integrations/:id/sync` mostra: última sincronização, total importado, falhas e log das últimas 50 corridas.

## Estrutura técnica

### DB (migração)
- `ALTER TABLE invoices ADD COLUMN external_provider text` (nullable)
- `ALTER TABLE invoices ADD COLUMN external_id text` (id no IX)
- `ALTER TABLE invoices ADD COLUMN external_url text` (link público IX)
- `ALTER TABLE invoices ADD COLUMN external_synced_at timestamptz`
- `CREATE UNIQUE INDEX uniq_invoices_external ON invoices (workspace_id, external_provider, external_id) WHERE external_id IS NOT NULL`
- Nova tabela `billing_sync_runs`:
  - `id`, `workspace_id`, `integration_id` (FK), `started_at`, `finished_at`, `status` (`running|ok|error`), `imported_count`, `updated_count`, `failed_count`, `cursor_from`, `cursor_to`, `error_message`, `details jsonb`
  - RLS: SELECT para admins do workspace; INSERT/UPDATE só via service_role.

### Edge Functions
1. **`invoicexpress-sync-invoices`** (manual + cron)
   - Input: `{integration_id, since?}` (opcional, default = 30 dias).
   - Valida JWT + admin do workspace (quando manual). Em modo cron usa `x-cron-secret`.
   - Usa o `invoicexpress-proxy` internamente (ou chama IX directamente via service_role) para `GET /invoices.json?date[from]=...&page=N`.
   - Itera todas as páginas, normaliza cada documento e faz UPSERT em `invoices` por `(workspace_id, external_provider, external_id)`.
   - Resolve `company_id`/`contact_id` por NIF/email (best-effort).
   - Regista corrida em `billing_sync_runs` com contadores e erros parciais.
   - Padrão Resilient Errors: 200 OK + `{ok:false, error}` em todas as falhas.

2. **`billing-sync-cron`** (HTTP target do `pg_cron`)
   - Lista integrações activas via service_role e dispara `invoicexpress-sync-invoices` para cada uma com `since = now-7d`.
   - Cron registado via `supabase--insert` (não migração, contém URL/anon key).

### Frontend
- `useBillingSyncRuns(integrationId)` — lista corridas (últimas 50).
- `useTriggerBillingSync()` — invoca `invoicexpress-sync-invoices` (manual).
- Página `BillingIntegrationDetailPage.tsx` (rota `/dashboard/settings/billing-integrations/:id`):
  - Cabeçalho com estado da ligação + botão "Sincronizar agora".
  - Tabela de runs (data, status, importados/atualizados/falhas, duração).
  - Link "Ver faturas importadas" → filtro `external_provider=invoicexpress` na lista de faturas.
- Em `InvoicesListPage` (já existente): adicionar badge "InvoiceXpress" com link `external_url` quando aplicável; coluna "Origem".

## Plano de implementação

1. Migração: colunas `external_*` em `invoices` + índice único + tabela `billing_sync_runs` + RLS.
2. Edge Function `invoicexpress-sync-invoices` (paginação, normalização, upsert, log de run).
3. Edge Function `billing-sync-cron` + agendamento `pg_cron` (06:00 UTC diário).
4. Hooks `useBillingSyncRuns`, `useTriggerBillingSync`.
5. Página `BillingIntegrationDetailPage` + rota.
6. Badge "InvoiceXpress" + link no listado de faturas.
7. QA: criar 1 fatura no IX → sincronizar manualmente → ver na lista CRM com badge.

## Critérios de aceitação

- Admin clica "Sincronizar agora" e em <15s vê a lista de faturas atualizada.
- Faturas IX aparecem com badge + número original + link clicável para abrir no IX.
- Sync incremental não duplica registos (idempotente por `external_id`).
- Estados (`paid`, `overdue`, `cancelled`) refletidos correctamente no CRM.
- Match automático cliente↔company por NIF quando existe; fallback para snapshot.
- `billing_sync_runs` mostra histórico claro com contadores e mensagem de erro quando falha.
- Cron diário corre sem intervenção e logs ficam em `billing_sync_runs`.
- RLS garante isolamento por workspace.
- Estados vazio/loading/erro/sem permissão tratados na UI.

## Riscos / pontos por validar

- **Rate limits InvoiceXpress** não documentados — proxy precisa de retry com backoff (vou adicionar 1 retry em 429/5xx).
- **Mapeamento de séries**: o IX tem múltiplas séries; nesta fase guardamos só `external_id` + `invoice_number` original sem replicar séries no CRM.
- **Notas de crédito**: ligadas à fatura original via `related_invoice_id` (precisa segunda passagem após o upsert principal).
- **Histórico inicial grande**: primeira sync usa janela 30 dias; para histórico completo o utilizador terá de carregar manualmente ajustando `since` (UI futura — fora deste scope).
- **Campo `paid_at`**: IX nem sempre devolve data exata de pagamento; usaremos `updated_at` do IX como aproximação quando `status=settled`.
- **Anti-flapping**: se `status` mudar de `paid` para outra coisa por engano no IX, refletir mas registar em `details` da run.
