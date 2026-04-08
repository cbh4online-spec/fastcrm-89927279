
## Módulo de Vagas — Reformulação Completa

### Fase 1: Painel Interno Melhorado

#### 1.1 KPIs no topo
- Cards com: Vagas Activas, Total Candidatos, Taxa de Conversão (candidatos→contratados), Tempo Médio de Preenchimento
- Dados derivados das tabelas `hr_job_postings` e `hr_candidates`

#### 1.2 Filtros e Pesquisa
- Barra de pesquisa por título
- Filtros por: status (activa/rascunho/fechada/cancelada), tipo de contrato, modalidade (presencial/remoto/híbrido)
- Filtros persistem na URL via query params

#### 1.3 Vista Tabela + Grid
- Toggle entre vista cards (actual, melhorada) e vista tabela
- Tabela com colunas: Título, Status, Tipo, Modalidade, Localização, Candidatos, Data criação
- Ordenação por coluna

#### 1.4 Edição Inline
- Drawer lateral que abre ao clicar "Editar" no menu contextual
- Reutiliza o mesmo formulário de criação mas em modo de edição
- Permite alterar status, publicar/fechar vaga

---

### Fase 2: Landing Page Pública de Carreiras

#### 2.1 Rota pública
- `/careers/:workspaceSlug` — listagem de vagas activas (sem autenticação)
- `/careers/:workspaceSlug/:jobSlug` — página individual da vaga
- Necessário gerar `slug` automaticamente ao criar vaga (trigger DB ou lógica frontend)

#### 2.2 Listagem pública
- Filtros por tipo de contrato e modalidade
- Pesquisa por título
- Cards com: título, localização, tipo, modalidade, salário (se visível)

#### 2.3 Página individual por vaga
- Descrição completa, requisitos, nice-to-have
- Informações: tipo, modalidade, salário, data publicação
- Botão "Candidatar-se" que abre formulário

#### 2.4 Branding do workspace
- Logo e nome da empresa no topo
- Descrição/tagline do workspace
- Cores alinhadas com o workspace (fallback para tema padrão)

#### 2.5 Formulário de candidatura
- Campos: Nome, Email, Telefone, LinkedIn (opcional), Carta de motivação (textarea)
- Upload de CV (ficheiro PDF/DOC)
- Validação com zod
- Ao submeter: cria registo em `hr_candidates` vinculado à vaga
- Confirmação visual de sucesso

---

### Fase 3: Ligação Interna ↔ Pública

- Na página de detalhe da vaga (painel interno), mostrar URL pública copiável
- Botão "Ver landing page" que abre a página pública em nova tab
- Ao publicar vaga, gerar slug e guardar `public_url`

---

### Alterações de Base de Dados

- Adicionar coluna `workspace_slug` na tabela workspaces (se não existir) ou usar o existente
- Trigger para gerar `slug` a partir do título em `hr_job_postings`
- Storage bucket `hr-cvs` para upload de CVs
- RLS: vagas activas + publicadas são lidas publicamente (SELECT anónimo filtrado por status='active')

---

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/pages/dashboard/hr/recruitment/JobOpeningsPage.tsx` | Reescrever com KPIs, filtros, tabela/grid, edição inline |
| `src/pages/dashboard/hr/recruitment/JobOpeningDetailPage.tsx` | Adicionar URL pública, botão "Ver landing" |
| `src/pages/public/CareersPage.tsx` | Criar — listagem pública de vagas |
| `src/pages/public/JobDetailPublicPage.tsx` | Criar — detalhe público + formulário |
| `src/components/hr/recruitment/JobEditDrawer.tsx` | Criar — drawer de edição inline |
| `src/components/hr/recruitment/JobFilters.tsx` | Criar — filtros e pesquisa |
| `src/components/hr/recruitment/JobKPIs.tsx` | Criar — cards de KPIs |
| `src/components/hr/recruitment/PublicJobCard.tsx` | Criar — card para landing page |
| `src/components/hr/recruitment/ApplicationForm.tsx` | Criar — formulário de candidatura |
| `src/hooks/hr/useJobPostings.ts` | Estender com query pública |
| `src/hooks/hr/usePublicJobApplication.ts` | Criar — submissão de candidatura |
| Migração DB | Slug trigger, RLS pública, storage bucket |

### Critérios de Aceitação

- [ ] KPIs mostram dados reais das vagas e candidatos
- [ ] Filtros funcionam por status, tipo, modalidade e pesquisa textual
- [ ] Toggle entre vista grid e tabela funciona
- [ ] Edição inline via drawer lateral actualiza a vaga
- [ ] Landing page pública acessível sem login em `/careers/:slug`
- [ ] Página individual da vaga com toda a informação
- [ ] Formulário de candidatura cria candidato na BD
- [ ] Upload de CV funciona
- [ ] Branding do workspace visível na landing page
- [ ] URL pública copiável no painel interno
