

# Substituir `.select("*")` por colunas explícitas — 15 queries core

## Diagnóstico

Hooks já com select explícito (não precisam alteração):
- `useOpportunitiesEnhanced` — já usa colunas explícitas
- `useSmartLeads` — já usa `LEADS_SELECT_COLUMNS`
- `useOpportunityKPIs` — já usa `"id, value, status, probability, created_at, updated_at"`
- `usePipelineStagesEnhanced` — já usa colunas explícitas
- `usePipelines` — já usa colunas explícitas

Hooks com `.select("*")` a corrigir (priorizados por frequência de uso):

| # | Hook | Tabela(s) | Colunas necessárias |
|---|------|-----------|---------------------|
| 1 | `useActivities` | crm_activities | id, workspace_id, entity_type, entity_id, activity_type, title, description, metadata, created_at, created_by |
| 2 | `useLeads` (list + detail) | leads | Reutilizar `LEADS_SELECT_COLUMNS` do useSmartLeads (mover para ficheiro partilhado) |
| 3 | `useCompanyDuplicates` | companies | id, name, email, website, tax_id, workspace_id |
| 4 | `useCompanyDuplicateGroups` | companies | id, name, email, website, tax_id, domain, workspace_id, created_at, industry, size |
| 5 | `useAccountBriefKPIs` (2 queries) | account_brief_kpi_snapshots | id, workspace_id, metric_key, metric_value, snapshot_date |
| 6 | `useChangeEvents` | change_events | id, workspace_id, event_type, entity_type, entity_id, entity_name, changed_by, description, metadata, created_at |
| 7 | `useCompanyAuditLog` | companies_audit_log | id, workspace_id, company_id, changed_by, changed_at, field_name, old_value, new_value |
| 8 | `useRFQAuditLog` | rfq_audit_log | id, workspace_id, rfq_id, changed_by, changed_at, field_name, old_value, new_value + profile join |
| 9 | `useClientTicketDetail` | client_tickets | id, workspace_id, subject, description, type, priority, status, client_user_id, company_id, assigned_to, tags, source, satisfaction_rating, satisfaction_comment, created_at, updated_at, resolved_at, closed_at |
| 10 | `useForecastsReports` (8 queries) | opportunities, contacts, contact_products, products | Seleccionar apenas colunas usadas nos cálculos |

## Estrutura técnica

### Constante partilhada para leads
Mover `LEADS_SELECT_COLUMNS` de `useSmartLeads.ts` para `src/hooks/constants/selectColumns.ts` e reutilizar em `useLeads.ts`.

### useForecastsReports — colunas por tabela
- **opportunities**: `id, value, status, probability, updated_at, created_at, expected_close_date, stage_id`
- **contacts**: `id, name, email, client_status, last_contact_at, created_at, workspace_id`
- **contact_products**: `id, product_id, workspace_id, status, purchased_quantity, consumed_quantity, purchase_date, next_renewal_date`
- **products**: `id, name, sku, category, price`

## Plano de implementação

### Ficheiros a alterar (10 ficheiros)

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/constants/selectColumns.ts` | **Novo** — constantes LEADS_SELECT, OPPORTUNITIES_SELECT, CONTACTS_SELECT |
| `src/hooks/useActivities.ts` | `.select("*")` → colunas explícitas |
| `src/hooks/useLeads.ts` | 2× `.select("*")` → `LEADS_SELECT_COLUMNS` |
| `src/hooks/useCompanyDuplicates.ts` | `.select("*")` → colunas de matching |
| `src/hooks/useCompanyDuplicateGroups.ts` | `.select("*")` → colunas de matching |
| `src/hooks/useAccountBriefKPIs.ts` | 2× `.select("*")` → colunas KPI |
| `src/hooks/useChangeEvents.ts` | `.select("*")` → colunas explícitas |
| `src/hooks/useCompanyAuditLog.ts` | `.select("*")` → colunas da interface |
| `src/hooks/useRFQAuditLog.ts` | `"*"` na parte base → colunas explícitas + join |
| `src/hooks/useClientTicketDetail.ts` | `.select("*")` → colunas do ticket |
| `src/hooks/useForecastsReports.ts` | 8× `.select("*")` → colunas por tabela |
| `src/hooks/useSmartLeads.ts` | Import da constante partilhada (opcional, pode manter inline) |

### Critérios de aceitação
- Zero `.select("*")` nos 15 hooks listados
- Todas as interfaces TypeScript continuam satisfeitas (nenhum campo undefined)
- Queries existentes devolvem os mesmos dados sem regressão

### Riscos
- Se algum componente consumidor usa um campo obscuro não listado na selecção, vai receber `undefined`. Mitigação: verificar as interfaces TypeScript de cada hook para garantir cobertura.
- `useForecastsReports` é o mais complexo (8 queries, 539 linhas) — risco de omitir colunas usadas downstream.

