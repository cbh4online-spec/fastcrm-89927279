

## Substituição Completa do Módulo de Recrutamento & ATS

### Diagnóstico

O módulo actual usa uma arquitectura diferente do guia:

| Actual | Guia (novo) |
|---|---|
| `hr_job_openings` | `hr_job_postings` (+ slug, requirements[], nice_to_have[], remote_option, employment_type) |
| `hr_candidates` (full_name, sem stage) + `hr_applications` (stage separado) | `hr_candidates` (first_name/last_name, stage directo, cv_parsed_data, ai_score, ai_analysis) |
| `hr_interviews` (via application_id) + `hr_interview_scorecards` | `hr_interviews` (via candidate_id, interviewer_ids[], feedback JSONB, recommendation) |
| `hr_candidate_notes`, `hr_email_templates` | `hr_candidate_activities` (activity log unificado) |
| Edge function: `hr-recruitment-ai` (multipurpose) | 2 edge functions: `hr-cv-parse-ai`, `hr-candidate-score-ai` |

**Impacto**: 6 tabelas antigas a dropar, 4 novas a criar. ~10 ficheiros a reescrever. `HRDashboardPage` usa `useCandidates` — necessita actualização.

---

### Plano (7 passos)

#### 1. Migração SQL — Drop old + Create new

**Drop** (com CASCADE):
- `hr_email_templates`, `hr_candidate_notes`, `hr_interview_scorecards`, `hr_interviews`, `hr_applications`, `hr_pipeline_stages`, `hr_job_openings`
- Dropar enum `hr_application_stage`, `hr_interview_type`
- **Manter** `hr_candidates` mas fazer ALTER para nova estrutura (rename full_name → split, add campos)

**Create**:
- `hr_job_postings` — com slug, requirements TEXT[], nice_to_have TEXT[], employment_type, remote_option, salary_min/max, currency, published_at, closes_at, public_url. Validation triggers em vez de CHECK para datas.
- **ALTER** `hr_candidates` — adicionar first_name, last_name, job_posting_id, stage (com valores do guia), cv_parsed_data JSONB, ai_score, ai_analysis JSONB, status, location, github_url, source, referrer_id, cover_letter_url. Drop full_name, cv_path, cover_letter, tags, notes.
- `hr_interviews` — nova estrutura com candidate_id, job_posting_id, interview_type (enum), interviewer_ids UUID[], location_type, meeting_link, feedback JSONB, overall_rating, recommendation.
- `hr_candidate_activities` — activity_type enum, content, metadata JSONB, created_by.

**RLS**: Conforme guia — job postings activos públicos, candidatos só HR/managers, entrevistas para envolvidos + HR, activities como candidatos.

**Índices + Triggers**: Conforme guia.

#### 2. Edge Functions (2 novas, remover 1 antiga)

- **`hr-cv-parse-ai`**: Recebe candidate_id + cv_text, usa Lovable AI (gemini-2.5-pro) para extrair dados estruturados do CV, actualiza hr_candidates com cv_parsed_data.
- **`hr-candidate-score-ai`**: Recebe candidate_id, lê candidato + job_posting, usa IA para gerar score 0-100 + analysis, actualiza hr_candidates.
- **Remover** `hr-recruitment-ai` (substituído pelas 2 novas + hooks locais para descrições/emails).

#### 3. Hooks (reescrever 4 ficheiros)

- **`useJobPostings.ts`** (renomear de useJobOpenings): CRUD completo para hr_job_postings com filtros por status.
- **`useCandidates.ts`**: Reescrever — first_name/last_name, join a hr_job_postings, `useParseCV` (invoca hr-cv-parse-ai), `useScoreCandidate` (invoca hr-candidate-score-ai), `useUpdateCandidateStage`.
- **`useInterviews.ts`**: Reescrever — via candidate_id, join a hr_candidates + hr_job_postings.
- **`useCandidateActivities.ts`** (novo): CRUD para hr_candidate_activities.
- **Apagar**: `useApplications.ts`, `useRecruitmentAI.ts`.

#### 4. Componentes

- **Reescrever `CandidateKanban.tsx`**: Baseado em candidates com stage directo (sem applications). Drag & drop entre stages do guia (new, screening, phone_interview, technical_interview, onsite_interview, offer, hired, rejected).
- **Novo `CandidatePipeline.tsx`**: Versão compacta para embeds.

#### 5. Páginas (reescrever 6 ficheiros)

- **`JobOpeningsPage.tsx` → `JobPostingsPage.tsx`**: Usar useJobPostings, mostrar employment_type, remote_option, salary range.
- **`JobOpeningDetailPage.tsx` → `JobPostingDetailPage.tsx`**: Kanban com candidates directos, sem applications.
- **`CandidatesPage.tsx`**: Adaptar para first_name/last_name, stage directo, ai_score badge, botão Parse CV.
- **`CandidateDetailPage.tsx`**: Tabs com perfil, CV parsed, AI analysis, activities log, entrevistas.
- **`InterviewsPage.tsx`**: Adaptar para nova estrutura (interviewer_ids, feedback, recommendation).
- **`RecruitmentDashboardPage.tsx`**: Actualizar KPIs — usar candidates com stage em vez de applications.

#### 6. Rotas e Dashboard

- Actualizar `HRRoutes.tsx` com novos imports (lazy).
- Actualizar `HRDashboardPage.tsx` — substituir `useCandidates` import pela nova versão.
- Actualizar `routeManifest.ts` se necessário (nomes de rotas mantêm-se).

#### 7. Limpeza

- Apagar ficheiros obsoletos: `useApplications.ts`, `useRecruitmentAI.ts`, `hr-recruitment-ai/`.
- Verificar zero referências a tabelas/hooks removidos.

---

### Critérios de Aceitação

1. Candidatos têm stage directo (sem tabela applications intermediária)
2. CV parsing via edge function dedicada extrai dados estruturados
3. AI scoring via edge function dedicada com score 0-100 + analysis
4. Pipeline Kanban com 8 stages do guia, drag & drop funcional
5. Activity log regista todas as acções (notas, emails, mudanças de stage)
6. Entrevistas com feedback JSONB e recommendation
7. Job postings com slug, requirements[], salary range
8. RLS conforme guia (públicos para activos, HR para candidatos)
9. Aplicação compila sem erros, zero referências a tabelas/hooks antigos

### Riscos

- **Dados existentes**: Se houver candidatos/vagas na BD actual, serão perdidos com o DROP. Migração de dados não está incluída.
- **HRDashboardPage**: Usa `useCandidates` — necessita actualização para nova interface (first_name/last_name).
- **Scope grande**: ~15 ficheiros a criar/reescrever + migração complexa. Execução em múltiplas iterações.

