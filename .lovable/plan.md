
## Portal de Recrutamento — Evolução Completa

### 1. Logotipos e descrição nos cards de vagas

**Vagas internas:** Usar o logo do workspace (já existe `workspace.logo_url`).
**Vagas externas:** Extrair favicon/logo da `source_url` via serviço de favicons (ex: `https://www.google.com/s2/favicons?domain=net-empregos.com&sz=64`).
**Descrição:** Mostrar as primeiras 2 linhas da descrição no card + skills como badges.

**Ficheiros:** `src/pages/public/CareersPage.tsx`

---

### 2. Registo self-service de empresas para publicar vagas

Nova funcionalidade que permite empresas externas registarem-se e publicarem vagas no portal, gerando leads automaticamente.

**Tabela nova: `portal_companies`**
- `id`, `name`, `email`, `phone`, `website`, `logo_url`, `nif`, `sector`, `location`, `status` (pending/active/blocked), `auth_user_id`, `workspace_id`

**Tabela nova: `portal_job_postings`**
- `id`, `portal_company_id`, `workspace_id`, `title`, `description`, `location`, `employment_type`, `remote_option`, `salary_range`, `requirements`, `status` (pending/active/expired/rejected), `published_at`, `expires_at`

**Fluxo:**
1. Empresa acede a `/careers/fastcrm/register` → formulário de registo (nome, email, password, empresa, NIF, website)
2. Conta criada (auth + portal_companies com status `pending`)
3. Auto-confirm desactivado — empresa confirma email
4. Após login, acede a `/careers/fastcrm/dashboard` → painel para gerir vagas
5. Publica vaga → status `pending` → admin aprova → aparece no portal
6. Cada empresa registada gera um lead no CRM (tabela `leads`)

**Páginas novas:**
- `/careers/:slug/register` — registo de empresa
- `/careers/:slug/login` — login de empresa
- `/careers/:slug/dashboard` — painel da empresa (listar/criar vagas)

**RLS:** portal_companies e portal_job_postings escopados por workspace_id. Empresas só vêem os seus dados.

---

### 3. Agregação na página pública

A página `/careers/fastcrm` mostra:
- Vagas internas (hr_job_postings com status active)
- Vagas externas agregadas (hr_talent_results)
- Vagas de empresas registadas (portal_job_postings com status active)

Todas com logo, descrição e badges.

---

### 4. Dashboard de KPIs de Recrutamento

Nova página: `/dashboard/hr/recruitment/analytics`

**Métricas de recrutamento:**
- Total de vagas publicadas (internas + portal)
- Candidaturas recebidas (hr_candidates count)
- Taxa de conversão visitante → candidatura
- Vagas por status (active/draft/closed)

**Tráfego do portal:**
- Usar analytics existente (pageviews em /careers/*)
- Visitantes únicos, top vagas visualizadas

**Leads e empresas:**
- Empresas registadas (portal_companies count)
- Vagas submetidas por externos
- Leads gerados via portal

**Implementação:** Queries agregadas via hooks, visualização com Recharts/Nivo (já instalados).

---

### Ordem de implementação

1. **Logos + descrição nos cards** (rápido, visual)
2. **Tabelas portal_companies + portal_job_postings** (migração)
3. **Registo e login de empresas** (auth + páginas)
4. **Painel da empresa** (dashboard + CRUD vagas)
5. **Agregação no portal** (unificar 3 fontes)
6. **Dashboard de KPIs** (analytics)

### Critérios de aceitação
- Cards com logo e descrição visíveis
- Empresa pode registar-se, confirmar email, fazer login e publicar vaga
- Vaga de empresa aparece no portal após aprovação
- Cada registo de empresa gera lead no CRM
- Dashboard com KPIs funcionais e dados reais
