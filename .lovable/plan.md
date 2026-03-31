

## Módulo de Recrutamento — Extensão do RH

### Diagnóstico

O módulo de RH actual cobre gestão de funcionários, ponto, turnos e ausências. Não existe qualquer funcionalidade de recrutamento. Esta é uma oportunidade de diferenciação significativa, especialmente com IA integrada.

### Funcionalidades do Sub-Módulo de Recrutamento

**1. Vagas (Job Openings)**
- Criar/editar vagas com título, departamento, tipo (full-time, part-time, estágio), localização, salário, descrição
- Estados: rascunho → publicada → em análise → fechada → arquivada
- Geração automática de descrição de vaga por IA (tom, requisitos, benefícios a partir do contexto do workspace)

**2. Pipeline de Candidatos (Kanban)**
- Board visual com fases configuráveis: Novo → Triagem → Entrevista → Teste → Oferta → Contratado / Rejeitado
- Drag & drop entre fases
- Filtros por vaga, fase, rating, fonte

**3. Ficha de Candidato**
- Dados pessoais, CV (upload), carta de motivação, links (LinkedIn, portfolio)
- Timeline de interacções (notas, emails, entrevistas)
- Rating/scoring (1-5 estrelas + notas)
- Tags e campos customizados

**4. IA Diferenciadora**
- **Triagem automática de CVs**: análise de CV vs requisitos da vaga → score de adequação + justificação
- **Geração de perguntas de entrevista**: baseadas no perfil do candidato e requisitos da vaga
- **Resumo de candidato**: síntese automática de CV, notas e entrevistas
- **Sugestão de rejeição/avanço**: recomendação com base no pipeline e scoring
- **Geração de email**: templates de resposta personalizados (convite entrevista, rejeição, oferta)

**5. Entrevistas**
- Agendar entrevistas com data, hora, tipo (presencial/remoto), entrevistadores
- Scorecard de entrevista (critérios configuráveis + nota + feedback)
- Resumo automático por IA do feedback dos entrevistadores

**6. Portal de Candidatura (público)**
- Página pública com vagas abertas (sem autenticação)
- Formulário de candidatura com upload de CV
- Confirmação automática por email

**7. Dashboard de Recrutamento**
- KPIs: vagas abertas, candidaturas recebidas, time-to-hire, taxa de conversão por fase
- Funil visual de candidatos
- Top fontes de recrutamento

**8. Conversão Candidato → Funcionário**
- Ao marcar candidato como "Contratado", criar automaticamente registo em `hr_employees`

### Estrutura Técnica

**Tabelas (migração):**

| Tabela | Finalidade |
|--------|-----------|
| `hr_job_openings` | Vagas (título, dept, tipo, descrição, salário, estado, created_by) |
| `hr_candidates` | Candidatos (nome, email, tel, linkedin, portfolio, cv_path, source, notes) |
| `hr_applications` | Candidatura = candidato + vaga + fase + rating + scoring_ai |
| `hr_application_stages` | Fases configuráveis por workspace |
| `hr_interviews` | Entrevistas agendadas (data, tipo, entrevistadores) |
| `hr_interview_scorecards` | Avaliações de entrevista (critérios, notas, feedback) |
| `hr_candidate_notes` | Notas/timeline do candidato |
| `hr_recruitment_emails` | Emails enviados/gerados por IA |

**Edge Functions:**
- `hr-recruitment-ai` — Triagem de CV, geração de perguntas, resumos, sugestões, emails (via Lovable AI)

**Páginas:**

| Rota | Página |
|------|--------|
| `/dashboard/hr/recruitment` | Dashboard de Recrutamento |
| `/dashboard/hr/recruitment/jobs` | Lista de Vagas |
| `/dashboard/hr/recruitment/jobs/:id` | Detalhe de Vaga + Pipeline Kanban |
| `/dashboard/hr/recruitment/candidates` | Lista de Candidatos |
| `/dashboard/hr/recruitment/candidates/:id` | Ficha de Candidato |
| `/dashboard/hr/recruitment/interviews` | Agenda de Entrevistas |
| `/apply/:workspaceSlug` | Portal Público de Candidatura |

**Componentes principais:**
- `RecruitmentDashboard` — KPIs + funil
- `JobOpeningForm` — Criar/editar vaga (com geração IA de descrição)
- `CandidateKanban` — Pipeline visual drag & drop
- `CandidateDetail` — Ficha completa + timeline + IA
- `InterviewScheduler` — Agendar + scorecards
- `CVScreeningPanel` — Resultado da triagem IA
- `RecruitmentEmailComposer` — Geração de emails por IA

**Hooks:**
- `useJobOpenings`, `useCandidates`, `useApplications`, `useInterviews`
- `useRecruitmentAI` (triagem, perguntas, resumos, emails)

### Plano de Implementação (faseado)

**Fase 1 — Base de Dados + CRUD**
1. Migração SQL: criar 8 tabelas com RLS
2. Hooks CRUD para vagas, candidatos, candidaturas
3. Páginas de listagem e formulários
4. Rotas no `HRRoutes.tsx` e `routeManifest.ts`

**Fase 2 — Pipeline Kanban + Entrevistas**
5. Componente Kanban com drag & drop (`@hello-pangea/dnd` já disponível)
6. Fases configuráveis por workspace
7. Agendamento de entrevistas + scorecards

**Fase 3 — IA**
8. Edge Function `hr-recruitment-ai` com Lovable AI
9. Triagem automática de CVs (score + justificação)
10. Geração de perguntas de entrevista
11. Resumo de candidato
12. Geração de emails

**Fase 4 — Portal Público + Dashboard**
13. Página pública de candidatura
14. Dashboard com KPIs e funil
15. Conversão candidato → funcionário

### Critérios de Aceitação
1. Criar vaga com geração IA de descrição funcional
2. Pipeline Kanban com drag & drop entre fases
3. Upload de CV com triagem automática por IA
4. Agendar entrevista com scorecard
5. Gerar email personalizado por IA
6. Dashboard com métricas reais
7. Portal público aceita candidaturas
8. Candidato contratado converte-se em funcionário

### Riscos
- Volume de trabalho elevado — implementar por fases é essencial
- Upload de CV requer storage bucket configurado
- Portal público necessita rota fora do `ModuleGuard`

