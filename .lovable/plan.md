

# Recolha de Sócios, Gerentes e Faturação — Account Brief

## Contexto
O sistema já utiliza Racius (via Firecrawl) no `lookup-company-nif` para dados básicos. As páginas do Racius contêm secções de **Sócios/Quotistas**, **Gerência/Administração** e **Volume de Negócios** (faturação dos últimos anos) que atualmente não são extraídas.

## Plano

### 1. Nova tabela `account_brief_corporate_data`
Armazena dados corporativos extraídos de registos públicos (Racius, etc.):

```
account_brief_corporate_data
├── id (UUID PK)
├── workspace_id (FK)
├── account_id (FK → account_brief_accounts)
├── nif (TEXT)
├── shareholders (JSONB) — [{name, quota_percent, quota_value, type}]
├── managers (JSONB) — [{name, role, start_date}]
├── annual_revenue (JSONB) — [{year, revenue, currency}]
├── capital_social (TEXT)
├── legal_nature (TEXT)
├── founding_date (TEXT)
├── company_status (TEXT)
├── source_url (TEXT)
├── extracted_at (TIMESTAMPTZ)
├── created_at / updated_at
└── RLS: workspace members
```

### 2. Nova edge function `account-brief-corporate-lookup`
- Recebe `accountId`, `workspaceId`, e opcionalmente `nif`
- Se NIF não fornecido, tenta pesquisar pelo nome da empresa no Racius via Firecrawl search
- Faz scrape da página Racius da empresa
- Usa Gemini para extrair de forma estruturada: sócios, gerentes, faturação anual
- Grava na tabela `account_brief_corporate_data`
- Reutiliza o padrão de Firecrawl scrape já existente no `lookup-company-nif`

### 3. Integração no pipeline de análise
- Adicionar como **Step opcional** no `account-brief-refresh-account` (após extração estruturada)
- Também disponível como ação manual independente na página de detalhe

### 4. Campo NIF na conta
- Adicionar coluna `nif` à tabela `account_brief_accounts`
- Adicionar campo NIF ao `AccountBriefEditDialog`

### 5. UI — Secção "Dados Corporativos" na página de detalhe
Na `AccountBriefAccountDetailPage`, novo card com 3 sub-secções:

- **Sócios/Quotistas**: tabela com nome, % quota, valor
- **Gerência/Administração**: lista com nome e cargo
- **Faturação Anual**: mini-gráfico de barras ou tabela com ano e volume de negócios (últimos 3 anos)
- Botão "Pesquisar Dados Corporativos" para acionar manualmente

### Ficheiros afetados
- **Migração SQL**: nova tabela + coluna `nif` em `account_brief_accounts`
- **Criado**: `supabase/functions/account-brief-corporate-lookup/index.ts`
- **Editado**: `supabase/functions/account-brief-refresh-account/index.ts` (step opcional)
- **Editado**: `src/components/account-brief/AccountBriefEditDialog.tsx` (campo NIF)
- **Criado**: `src/components/account-brief/AccountBriefCorporateData.tsx`
- **Criado**: `src/hooks/useAccountBriefCorporateData.ts`
- **Editado**: `src/pages/AccountBriefAccountDetailPage.tsx` (integrar secção)

