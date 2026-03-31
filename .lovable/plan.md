

## Fase 6: Navigation & Dashboard RH — Plano

### Diagnóstico

O dashboard RH actual (`HRDashboardPage.tsx`) tem 4 KPI cards básicos (funcionários, presentes, ausências pendentes, horas semanais), gráfico de horas e lista de presentes. Faltam:

| Componente | Estado |
|---|---|
| KPI "Candidatos Activos" | ❌ Não existe |
| KPI "Novas Contratações" | ❌ Não existe |
| Quick actions (links rápidos) | ❌ Não existe |
| Calendário de ausências mensal | ❌ Não existe |
| Widgets de OKRs/Feedback/Check-ins | ❌ Não existe |

Sidebar e rotas estão correctas — todos os módulos já têm entradas no `routeManifest.ts`.

---

### Plano de Implementação

#### 1. Expandir KPI cards (4 → 6)
- Adicionar **"Candidatos Activos"** — usando `useCandidates()` filtrado por status != archived
- Adicionar **"Novas Contratações"** — usando `useHREmployees` filtrado por `hire_date` nos últimos 30 dias
- Reorganizar grid para 6 cards (3×2 em desktop)

#### 2. Quick Actions
- Secção com botões/links rápidos que navegam para:
  - Adicionar Colaborador → `/dashboard/hr/employees`
  - Criar Pedido de Ausência → `/dashboard/hr/absences`
  - Publicar Vaga → `/dashboard/hr/recruitment/jobs`
  - Criar OKR → `/dashboard/hr/okrs`
  - Agendar Check-in → `/dashboard/hr/checkins`

#### 3. Calendário de ausências (mini)
- Componente compacto com navegação mensal (prev/next)
- Mostra ausências aprovadas do mês com avatar + tipo
- Usa `useHRAbsences("approved")` filtrado por mês seleccionado

#### 4. Widgets resumo
- **OKRs activos**: count + progress médio (usando `useOKRs`)
- **Feedback não lido**: count (usando `useFeedback`)
- **Próximos check-ins**: lista dos 3 mais próximos (usando `useCheckins`)

---

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/pages/dashboard/hr/HRDashboardPage.tsx` | Refactor completo — adicionar KPIs, quick actions, calendário, widgets |

### Critérios de Aceitação
1. 6 KPI cards com dados reais
2. Quick actions navegam correctamente
3. Calendário mostra ausências aprovadas com navegação mensal
4. Widgets de OKRs/feedback/check-ins com dados reais
5. Layout responsivo (mobile: 1 coluna, tablet: 2, desktop: 3)
6. Estados vazios e loading tratados

