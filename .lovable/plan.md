

## Plano: Portal de Recrutamento com Firecrawl — Pesquisa de Candidatos e Ofertas de Emprego

### Contexto
Utilizar o Firecrawl (já conectado) para pesquisar na web por candidatos e ofertas de emprego relevantes, funcionando como um portal de recrutamento inteligente. Os resultados são persistidos numa nova tabela para gestão posterior.

### Arquitectura

```text
┌─────────────────────────────────────┐
│  TalentSearchPage (nova página)     │
│  - Pesquisa por cargo/skills/local  │
│  - Tipo: candidatos OU ofertas      │
│  - Resultados com preview           │
│  - Guardar como candidato / vaga    │
└──────────────┬──────────────────────┘
               │ invoke
┌──────────────▼──────────────────────┐
│  Edge Function: hr-talent-search    │
│  - Firecrawl search (portais PT)    │
│  - AI extraction (Gemini) → dados   │
│  - Persistir em hr_talent_results   │
└─────────────────────────────────────┘
```

### 1. Nova tabela: `hr_talent_results`

Armazena resultados de pesquisa web (candidatos encontrados e ofertas de emprego de concorrentes).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| search_type | text | `candidate` ou `job_offer` |
| search_query | text | Query original |
| source_url | text | URL da fonte |
| source_platform | text | LinkedIn, Indeed, Net-Empregos, etc. |
| title | text | Nome do candidato ou título da vaga |
| description | text | Bio/resumo ou descrição da vaga |
| location | text | Localização extraída |
| skills | text[] | Competências extraídas |
| raw_content | text | Conteúdo markdown bruto |
| extracted_data | jsonb | Dados estruturados extraídos pela IA |
| status | text | `new`, `reviewed`, `imported`, `dismissed` |
| imported_as | text | `candidate` ou `job_posting` (após importação) |
| imported_id | uuid | ID do registo importado |
| created_at | timestamptz | |

RLS: Escopado por workspace_id, SELECT/INSERT/UPDATE para membros autenticados.

### 2. Edge Function: `hr-talent-search`

- Recebe: `{ search_type, query, location, workspace_id }`
- Constrói queries inteligentes por tipo:
  - **Candidatos**: `"[cargo] [skills] CV site:linkedin.com/in OR site:indeed.pt"` 
  - **Ofertas**: `"[cargo] [localização] emprego site:indeed.pt OR site:net-empregos.com OR site:sapo.pt/emprego"`
- Chama `firecrawl-search` com `scrapeOptions: { formats: ['markdown'] }`
- Usa AI Gateway (Gemini) para extrair dados estruturados do markdown (nome, skills, localização, empresa, salário)
- Persiste resultados em `hr_talent_results`

### 3. Nova página: `TalentSearchPage.tsx`

Acessível em `/dashboard/hr/recruitment/talent-search`. Contém:

- **Barra de pesquisa** com campos: query livre, tipo (candidatos/ofertas), localização
- **Filtros rápidos** por plataforma e status
- **Lista de resultados** em cards com:
  - Título, localização, plataforma, preview do conteúdo
  - Skills extraídas como badges
  - Botões: "Ver fonte" (abre URL), "Importar como candidato", "Importar como vaga", "Descartar"
- **Acção de importação**: Cria registo em `hr_candidates` ou `hr_job_postings` a partir dos dados extraídos
- **Histórico**: Tab com pesquisas anteriores e resultados guardados

### 4. Hook: `useTalentSearch.ts`

- `useTalentSearch()` — query de resultados existentes com filtros
- `useSearchTalent()` — mutation que invoca a edge function
- `useImportTalentResult()` — mutation que copia resultado para `hr_candidates` ou `hr_job_postings`
- `useDismissTalentResult()` — actualiza status para `dismissed`

### 5. Integração no menu HR

- Adicionar link "Pesquisa de Talento" no menu de recrutamento
- Ícone `Search` ao lado das vagas e candidatos

### Ficheiros a criar/modificar

| Ficheiro | Acção |
|----------|-------|
| `supabase/migrations/...hr_talent_results.sql` | Nova tabela + RLS |
| `supabase/functions/hr-talent-search/index.ts` | Nova edge function |
| `src/pages/dashboard/hr/recruitment/TalentSearchPage.tsx` | Nova página |
| `src/hooks/hr/useTalentSearch.ts` | Novo hook |
| `src/App.tsx` | Nova rota |
| Menu lateral HR | Link para pesquisa de talento |

### Critérios de aceitação

- Pesquisar candidatos por cargo/skills retorna resultados reais da web
- Pesquisar ofertas de emprego retorna vagas de portais portugueses
- Resultados persistidos na BD com dados extraídos pela IA
- Importar resultado cria candidato ou vaga no sistema HR
- RLS escopado por workspace_id
- Estados loading, vazio e erro tratados

