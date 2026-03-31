

## Fase 7: Avaliações de Desempenho Anuais — Plano

### Diagnóstico

| Requisito | Estado |
|---|---|
| Tabelas `hr_review_cycles`, `hr_competencies`, `hr_performance_reviews`, etc. | ❌ Nenhuma existe |
| Edge functions de IA para rating | ❌ Não existe |
| Hook `usePerformanceReviews` | ❌ Não existe |
| Página de Reviews | ❌ Não existe |
| Integração com OKRs e Feedback | ✅ Tabelas `hr_okrs` e `hr_feedback` existem |

**Adaptações ao guia**:
- `hr_employees` usa `full_name` (não first_name/last_name) — queries e displays adaptados
- `hr_positions` não existe como tabela — remover FK, usar `job_title` do employee
- CHECK constraints para datas substituídos por validation triggers
- Edge function usa Lovable AI (gemini-2.5-pro) em vez de Anthropic API
- Guia referencia `hr_employees(id)` para employee_id/manager_id — confirmar que essas colunas existem na tabela

---

### Plano (5 passos)

#### 1. Migração SQL — 7 tabelas novas

| Tabela | Finalidade |
|---|---|
| `hr_review_cycles` | Ciclos de avaliação (anual, semestral, probatório) |
| `hr_competencies` | Framework de competências por workspace |
| `hr_performance_reviews` | Avaliações individuais com self/manager/AI ratings |
| `hr_review_competency_ratings` | Ratings por competência (self, manager, peer, final) |
| `hr_peer_reviews` | Avaliações 360° entre pares |
| `hr_calibration_sessions` | Sessões de calibração entre managers |
| `hr_review_activities` | Log de actividades por review |

Inclui: índices, triggers (`updated_at`, `calculate_overall_review_rating`), RLS conforme guia (cycles → HR admin manage / all view active, reviews → employee+manager+HR, peer reviews → reviewer+reviewee+HR, calibration → participantes+HR).

**Nota**: Usar validation triggers em vez de CHECK para datas. Unique constraint `(employee_id, review_cycle_id)` mantido. CHECK `reviewer_id != reviewee_id` em `hr_peer_reviews` mantido (é imutável).

#### 2. Edge Functions (2 novas)

- **`hr-review-ai-suggest-rating`**: Recebe `review_id`, busca review com competency ratings, peer reviews, OKRs do ano e feedback recebido. Usa Lovable AI (gemini-2.5-pro) para sugerir rating 1-5 com label, confiança, factores chave, pontos fortes e áreas de melhoria. Actualiza `ai_suggested_rating` e `ai_analysis` na review.
- **`hr-review-create-cycle`**: Recebe `workspace_id`, `year`, `cycle_type`. Cria ciclo com deadlines calculadas, depois cria uma `hr_performance_reviews` para cada funcionário activo com o respectivo `manager_id`.

#### 3. Hook React

**`src/hooks/hr/usePerformanceReviews.ts`**:
- `useReviewCycles(workspaceId)` — listar ciclos com contagem de reviews
- `useCreateReviewCycle()` — mutation que invoca edge function
- `usePerformanceReviews(cycleId)` — listar reviews do ciclo com employee/manager join
- `usePerformanceReview(reviewId)` — detalhe com competency ratings, peer reviews, activities
- `useSubmitSelfReview()` — actualizar self fields + mudar status
- `useSubmitManagerReview()` — actualizar manager fields + mudar status
- `useSuggestRatingAI()` — invocar edge function
- `useCompetencies(workspaceId)` — CRUD competências
- `usePeerReviews(reviewId)` — listar/submeter peer reviews
- `useCalibrationSessions(cycleId)` — CRUD sessões de calibração

#### 4. Página e Componentes

**`src/pages/dashboard/hr/HRPerformanceReviewsPage.tsx`**:
- **Tabs**: Ciclos | Competências | Calibração
- **Tab Ciclos**: Lista de ciclos com stats (total, self done, manager done, completed). Expandir para ver reviews individuais com status badges. Botão "Criar Ciclo" com dialog (ano, tipo).
- **Review Detail (inline/dialog)**: Self-assessment form (rating, achievements[], challenges, comments). Manager form (rating, strengths, areas, comments, promotion/salary recommendations). Peer reviews recebidos. AI suggestion com botão "Sugerir Rating IA". Activity log.
- **Tab Competências**: CRUD de competências (nome, descrição, categoria, nível). Grelha com ratings por review.
- **Tab Calibração**: Agendar sessão, seleccionar reviews, registar decisões.

**Componente `ReviewCycleManager.tsx`**: Card com progress bars de auto-avaliação e manager, deadlines, stats — conforme guia.

#### 5. Rotas e Navegação

- Adicionar rota `/dashboard/hr/reviews` ao `HRRoutes.tsx`
- Adicionar entrada no `routeManifest.ts` (grupo "rh")
- Adicionar breadcrumb label no `HRBreadcrumb.tsx`

---

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar (7 tabelas + RLS + triggers + índices) |
| `supabase/functions/hr-review-ai-suggest-rating/index.ts` | Criar |
| `supabase/functions/hr-review-create-cycle/index.ts` | Criar |
| `src/hooks/hr/usePerformanceReviews.ts` | Criar |
| `src/pages/dashboard/hr/HRPerformanceReviewsPage.tsx` | Criar |
| `src/components/hr/ReviewCycleManager.tsx` | Criar |
| `src/routes/HRRoutes.tsx` | Adicionar rota |
| `src/config/routeManifest.ts` | Adicionar entrada |
| `src/components/hr/HRBreadcrumb.tsx` | Adicionar label |

### Critérios de Aceitação

1. Ciclos CRUD com criação automática de reviews para todos os funcionários activos
2. Self-review com rating, achievements e comments submissível pelo funcionário
3. Manager review com rating, strengths, areas, recomendações de promoção/salário
4. Peer reviews 360° com opção anónima e limites min/max de reviewers
5. AI rating suggestion baseado em dados reais (OKRs, feedback, peer reviews, competências)
6. Competency framework com ratings multi-fonte (self, manager, peer, final calibrado)
7. Sessões de calibração com registo de decisões e ajustes
8. Activity log regista todas as transições de estado
9. RLS garante visibilidade correcta por role (employee vê a sua, manager vê equipa, HR vê tudo)
10. Progress bars e stats no ciclo actualizam com dados reais

