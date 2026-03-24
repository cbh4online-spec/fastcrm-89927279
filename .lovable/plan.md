

## Account Brief — Módulo de Inteligência Comercial B2B

Módulo nativo do FastCRM que transforma websites de empresas-alvo em briefings comerciais acionáveis para equipas de vendas. Implementação em 4 fases conforme especificado.

---

### FASE 1 — Fundação (Instalação, Rotas, Onboarding, CRUD, Dashboard)

#### 1.1 Base de Dados (Migration)

Criar as seguintes tabelas com RLS por `workspace_id`:

- `account_brief_workspaces` — config e estado do módulo por workspace
- `account_brief_profiles` — perfil da empresa utilizadora
- `account_brief_icp_profiles` — ICP definido pelo utilizador
- `account_brief_accounts` — contas-alvo (entidade central)
- `account_brief_notes` — notas manuais por conta
- `account_brief_analysis_runs` — runs de análise (estado, duração, erros)

RLS: todas as tabelas com policy `workspace_members` check, consistente com o padrão existente.

#### 1.2 Marketplace Registration

Inserir registo na tabela `marketplace_modules`:
- slug: `account-brief`
- name: `Account Brief`
- category: `intelligence`
- pricing_model: `included` (MVP sem cobrança)
- manifest_json com objects, settings_pages, feature_flags

#### 1.3 Rotas (App.tsx)

Adicionar lazy imports para:
- `/dashboard/account-brief` → Dashboard
- `/dashboard/account-brief/onboarding` → Onboarding
- `/dashboard/account-brief/accounts` → Lista
- `/dashboard/account-brief/accounts/:id` → Detalhe
- `/dashboard/account-brief/analysis` → Estado análises
- `/dashboard/account-brief/settings` → Definições
- `/dashboard/admin/account-brief` → Admin

Todas protegidas com `ModuleGuard` (`moduleSlug: "account-brief"`).

#### 1.4 Navegação (nav.v1.ts, nav.v2.ts)

Novo grupo "Account Brief" com `moduleSlug: "account-brief"`, icon `Briefcase`, cor `text-indigo-500`:
- Dashboard, Contas, Análises, Definições

#### 1.5 Páginas (Fase 1)

**AccountBriefOnboardingPage.tsx** — 3 steps wizard:
1. Perfil da empresa (nome, tipo equipa, setor)
2. ICP (tipo empresa, indústria, geografia, tamanho)
3. Primeiras contas (domínio + nome)

**AccountBriefDashboardPage.tsx** — KPI cards:
- Total contas, melhor score, recentes, growth signals, careers, ICP fit
- CTA "Adicionar Conta"
- Tabela resumida das top contas

**AccountBriefAccountsPage.tsx** — Tabela filtrável:
- Colunas: nome, domínio, setor, geografia, score, estado, última análise, favorito
- Filtros: score, geografia, setor, estado, favorito, growth, hiring
- Ações: adicionar, editar, remover, favoritar, relançar

**AccountBriefAccountDetailPage.tsx** (base):
- Header com nome, domínio, score badge, estado, ações
- Secções placeholder para briefing (Fase 3)
- Notas internas com CRUD
- Estado comercial (new → researching → outreach_ready → contacted → follow_up)

#### 1.6 Hooks (Fase 1)

- `useAccountBriefOnboarding` — save/load onboarding state
- `useAccountBriefAccounts` — CRUD contas com filtros
- `useAccountBriefAccount` — detalhe single account
- `useAccountBriefDashboard` — aggregated metrics
- `useAccountBriefNotes` — CRUD notas
- `useAccountBriefSettings` — workspace settings

---

### FASE 2 — Firecrawl Discovery, Crawl, Runs

#### 2.1 Tabelas adicionais (Migration)

- `account_brief_urls` — URLs descobertas/manuais
- `account_brief_pages` — conteúdo processado
- `account_brief_page_snapshots` — snapshots com hash
- `account_brief_analysis_errors` — erros por URL/step

#### 2.2 Edge Functions

**`account-brief-discover-pages`**
- Recebe `account_id` + `domain`
- Usa `firecrawl.map(domain)` do shared client existente
- Classifica URLs por page_type (about, products, pricing, careers, etc.)
- Persiste em `account_brief_urls`

**`account-brief-crawl-site`**
- Recebe `account_id` + lista de URLs
- Usa `firecrawl.scrape()` para cada URL (max ~15 páginas)
- Guarda em `account_brief_pages`
- Cria snapshots com hash em `account_brief_page_snapshots`
- Actualiza `account_brief_analysis_runs` com progresso

**`account-brief-analysis-status`**
- Consolida estado operacional de todas as runs
- Retorna métricas para a página de análises

**`account-brief-reprocess-url`**
- Reprocessa URL específica que falhou

#### 2.3 Páginas (Fase 2)

**AccountBriefAnalysisPage.tsx**
- Lista runs recentes com estado (queued/processing/completed/partial/failed)
- Páginas descobertas/processadas/falhadas por run
- Duração, erros, acção reprocessar
- Filtro por estado

#### 2.4 Hooks (Fase 2)

- `useAccountBriefAnalysisRuns` — lista/detalhe runs
- `useAccountBriefDiscover` — trigger discovery + crawl

---

### FASE 3 — Extração, Briefing, Score, Copy Actions

#### 3.1 Tabelas adicionais (Migration)

- `account_brief_briefs` — briefing estruturado (JSON blocks)
- `account_brief_scores` — score total + sub-scores
- `account_brief_score_factors` — fatores positivos/negativos explicáveis
- `account_brief_public_contacts` — contactos públicos encontrados

#### 3.2 Edge Functions

**`account-brief-extract-structured`**
- Recebe `account_id`
- Lê páginas processadas de `account_brief_pages`
- Usa Lovable AI (gemini-2.5-pro) para extrair:
  - Identidade, Oferta, Sinais comerciais, Personalização, Contactos públicos
- Persiste JSON estruturado

**`account-brief-generate-brief`**
- Recebe dados estruturados + ICP do workspace
- Usa Lovable AI para gerar briefing comercial em PT-PT:
  - Resumo executivo, O que faz, Para quem vende, Produtos, Sinais, Personalização, Ângulos outreach, Objeções
- Regras de qualidade: linguagem de negócio, frases curtas, acionável
- Distingue "facto observado" de "hipótese útil"

**`account-brief-compute-score`**
- Calcula score 0-100 baseado em:
  - ICP fit, presença geográfica, growth signals, maturidade comercial, personalização
- Gera sub-scores (ICP Fit, Growth, Maturity, Personalization)
- Gera fatores positivos/negativos com explicação
- Score labels: Muito Alto (80+), Alto (60-79), Médio (40-59), Baixo (<40)

**`account-brief-refresh-account`**
- Orquestra pipeline completo: discover → crawl → extract → brief → score
- Actualiza `account_brief_analysis_runs`

#### 3.3 UI Enhancements

**AccountBriefAccountDetailPage.tsx** (completo):
- Secções completas do briefing (A-L conforme spec)
- Score badge com sub-scores e fatores
- Botões "Copiar" para: resumo, insights, ângulos outreach
- Favoritar, mudar estado comercial
- Páginas importantes encontradas
- Histórico de análises

#### 3.4 Hooks (Fase 3)

- `useAccountBriefScore` — score + fatores
- `useAccountBriefBrief` — briefing completo

---

### FASE 4 — CRM Link, Kernel Events, Diffs, Admin, QA

#### 4.1 Tabelas adicionais (Migration)

- `account_brief_account_sources` — fontes da conta
- `account_brief_diff_events` — diferenças entre runs

#### 4.2 Edge Functions

**`account-brief-link-company`**
- Liga conta a `companies.id` do CRM
- Opcionalmente cria empresa/contacto no CRM

**`account-brief-diff-runs`**
- Compara runs consecutivas
- Detecta: novas páginas, headline mudou, CTA mudou, novas vagas, novas geografias, score mudou
- Persiste em `account_brief_diff_events`

#### 4.3 Kernel Events

Emitir via `emitKernelEvent()` existente para todos os eventos especificados (account_created, analysis_completed, score_updated, etc.) com `source_module: "account-brief"`.

#### 4.4 System Health

Adicionar módulo ao sistema de health checks existente — registar runs das edge functions em `system_function_runs`, adicionar smoke test mínimo.

#### 4.5 Admin Page

**AccountBriefAdminPage.tsx**:
- Relançar análise, ver status/erros, reprocessar URLs, contagem páginas por conta
- Estrutura preparada para consumo por créditos (sem implementar billing)

#### 4.6 CRM Integration UI

No detalhe da conta:
- "Associar a empresa existente" (search/select)
- "Criar empresa no CRM"
- "Criar contacto no CRM"
- "Abrir empresa no CRM" (link direto)

#### 4.7 Seed/Demo Data

3 contas demo com scores diferentes, notas, análise com erro parcial.

---

### Ficheiros a criar (resumo)

**Páginas** (~7):
`src/pages/AccountBrief*.tsx` (Dashboard, Onboarding, Accounts, AccountDetail, Analysis, Settings, Admin)

**Hooks** (~10):
`src/hooks/useAccountBrief*.ts`

**Edge Functions** (~9):
`supabase/functions/account-brief-*/index.ts`

**Ficheiros a editar**:
- `src/App.tsx` — rotas
- `src/config/nav.v1.ts`, `nav.v2.ts` — navegação
- Migrations (~4, uma por fase)

### Decisões técnicas

| Aspecto | Decisão |
|---------|---------|
| AI Model | Lovable AI `google/gemini-2.5-pro` (melhor para extração + raciocínio) |
| Crawling | Firecrawl shared client existente (`_shared/firecrawl-client.ts`) |
| Auth | Infraestrutura FastCRM existente, RLS por workspace |
| Score | Determinístico com pesos + AI reasoning para explicação |
| Pipeline | Sequencial via edge functions, correlation_id por run |
| Estado comercial | Enum simples na tabela `account_brief_accounts` |

### Implementação

Dada a dimensão, implementarei **Fase 1 + Fase 2** numa primeira iteração (fundação + crawl), seguida de **Fase 3 + Fase 4** (briefing + integrações).

