

# Conector de Feed CSV da Visiotech Security

## Contexto

O URL fornecido (`visiotechsecurity.com/...generateCSV...`) é um endpoint que gera um ficheiro CSV com o catálogo de produtos do fornecedor Visiotech. Este CSV contém SKUs, nomes, preços, categorias e especificações que podem ser usados para criar/atualizar produtos no FastCRM.

O sistema já tem infraestrutura de importação de fornecedores (`supplier_price_imports`, `supplier-import-parse`, `supplier-import-validate`, `supplier-import-commit`), mas funciona apenas com upload manual de ficheiros. O objetivo é criar um conector automático que:
1. Descarrega o CSV diretamente do URL da Visiotech
2. Processa e mapeia os dados automaticamente
3. Permite sincronização manual ou agendada

## Arquitetura

```text
┌──────────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│  UI: Supplier     │────▶│ Edge: supplier-feed-sync │────▶│ Visiotech CSV URL│
│  Feed Config      │     │  - Download CSV          │     └──────────────────┘
│  (Settings page)  │     │  - Parse rows            │
└──────────────────┘     │  - Upsert products       │
                          │  - Update prices          │
                          └─────────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │ supplier_feeds     │
                          │ supplier_feed_logs │
                          └───────────────────┘
```

## Step 1 — Database Migration

Create two new tables:

**supplier_feeds** — stores feed configuration per supplier
- `id`, `workspace_id`, `supplier_id`, `feed_name`, `feed_url`, `feed_type` (csv/json/xml)
- `auto_sync_enabled`, `sync_interval_hours` (default 24)
- `column_mapping` (jsonb) — maps CSV columns to product fields
- `last_sync_at`, `last_sync_status`, `last_sync_rows`
- `auth_config` (jsonb) — optional auth params (token, username in URL)
- `csv_delimiter`, `csv_encoding` defaults
- RLS: workspace_members scoped

**supplier_feed_logs** — sync history
- `id`, `feed_id`, `workspace_id`, `status` (running/completed/failed)
- `total_rows`, `created`, `updated`, `skipped`, `errors`
- `error_message`, `started_at`, `completed_at`
- RLS: workspace_members scoped

## Step 2 — Edge Function: `supplier-feed-sync`

New edge function that:
1. Receives `{ feed_id }` or `{ feed_url, workspace_id, supplier_id }` for ad-hoc
2. Downloads CSV from the URL (with timeout of 60s)
3. Parses CSV using a lightweight parser (split by delimiter)
4. For each row, applies column_mapping to extract: `sku`, `name`, `description`, `price`, `category`, `brand`, `image_url`
5. For each row with a valid SKU:
   - Check if product exists in workspace (by SKU match)
   - If exists: update price, stock, metadata
   - If not: create as draft product (or `supplier_products` entry)
6. Logs results to `supplier_feed_logs`
7. Returns summary: `{ total, created, updated, skipped, errors }`

Auth guard: validates JWT + workspace membership.

## Step 3 — React Hook: `useSupplierFeeds`

New hook at `src/hooks/useSupplierFeeds.ts`:
- `feeds[]` — list of configured feeds for current workspace
- `feedLogs(feedId)` — sync history
- `createFeed(config)` / `updateFeed(id, config)` / `deleteFeed(id)`
- `syncNow(feedId)` — triggers manual sync via edge function
- `isSyncing` state

## Step 4 — UI Components

**SupplierFeedConfigDialog** — modal to add/edit a feed:
- Feed name input
- Feed URL input (pre-filled with Visiotech URL)
- Feed type selector: CSV (default)
- CSV delimiter: `;` | `,` | `\t`
- Encoding: UTF-8 | ISO-8859-1
- "Testar URL" button — downloads first 5 rows to preview columns
- Column mapping section: auto-detected columns mapped to product fields via dropdowns
- Auto-sync toggle + interval selector (12h / 24h / 48h / semanal)
- Save button

**SupplierFeedCard** — shown in Suppliers page or a new "Feeds" tab:
- Feed name, URL (truncated), last sync time
- Status badge (ok/error/never synced)
- Stats: last sync created/updated/errors
- "Sincronizar agora" button
- Edit / Delete actions

**SupplierFeedLogsTable** — expandable section showing sync history

## Step 5 — Integration

- Add a "Feeds" tab or section to the existing `SuppliersPage` or supplier detail
- Pre-configure Visiotech as a known feed template (URL pattern, common column names)
- Store the feed URL with token securely (the URL already contains the auth token)

## Technical Details

- The CSV from Visiotech likely uses `;` as delimiter and ISO-8859-1 encoding (common for European suppliers)
- Edge function uses `TextDecoder` with proper encoding support
- CSV parsing is done in-function (no external deps) — split by lines, then by delimiter
- Product matching uses SKU as primary key, falling back to name similarity
- Large CSVs (10k+ rows) are processed in batches of 500 upserts

