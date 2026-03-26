

# Copiar Relatório do Account Brief ao Associar a Lead/Empresa

## Objetivo
Quando uma conta do Account Brief é associada a uma Lead ou Empresa no CRM, os dados do briefing devem ser copiados automaticamente para enriquecer o registo CRM.

## Mapeamento de campos

### Account Brief → Company
| Account Brief | Company |
|---|---|
| `description_short` / `executive_summary` | `description` / `ai_summary` |
| `probable_sector` | `industry` |
| `probable_geography` | `country` |
| `domain` | `domain` |
| `nif` | `tax_id` |
| `email_main` | `email` |
| `phone_main` | `phone` |
| `tagline` | `notes` (append) |
| Social URLs (linkedin, facebook, instagram, twitter, tiktok, youtube) | Campos correspondentes |
| Corporate data: `capital_social`, `legal_nature`, `founding_date`, `company_status` | Campos correspondentes |
| Corporate data: `shareholders`, `managers` | `company_context` (JSONB) |
| Corporate data: `annual_revenue` (array) | `sales_2023`/`sales_2024`/`sales_2025` |
| `total_score` | `company_score` |

### Account Brief → Lead
| Account Brief | Lead |
|---|---|
| `description_short` | `about` |
| `probable_sector` | `industry` |
| `domain` → website | `website` |
| `nif` | `tax_id` |
| `email_main` | `email` (se vazio) |
| `phone_main` | `phone` (se vazio) |
| Social URLs | Campos correspondentes |
| Corporate data: `capital_social`, `legal_nature`, `founding_date`, `company_status` | Campos correspondentes |
| Corporate data: `annual_revenue[0].revenue` | `annual_revenue` |
| `total_score` | `lead_score` |

## Regra importante
Apenas preencher campos **vazios/null** no registo CRM — nunca sobrescrever dados existentes.

## Alterações

### 1. Edge function `account-brief-link-company` (editar)
- Após associar (tanto para empresa existente como nova), buscar todos os dados do account brief + corporate data
- Fazer UPDATE na empresa com os campos mapeados, usando `COALESCE` para não sobrescrever dados existentes
- Registar na `account_brief_account_sources` que houve enriquecimento

### 2. Hook `useAccountBriefCRMLink.ts` — mutação `linkLead` (editar)
- Transformar a associação de lead numa chamada a uma nova edge function (ou expandir a existente) para que o servidor faça o enriquecimento
- **Nova edge function**: `account-brief-link-lead`
  - Recebe `accountId`, `workspaceId`, `leadId`
  - Busca account brief + corporate data
  - Faz UPDATE na lead com campos mapeados (só preenche nulls)
  - Atualiza `account_brief_accounts.lead_id`

### 3. Toast de feedback (sem alteração de ficheiro adicional)
- Mensagem atualizada: "Lead associada e enriquecida com dados do briefing!"

## Ficheiros afetados
- **Editado**: `supabase/functions/account-brief-link-company/index.ts`
- **Criado**: `supabase/functions/account-brief-link-lead/index.ts`
- **Editado**: `src/hooks/useAccountBriefCRMLink.ts` (linkLead usa nova edge function)

