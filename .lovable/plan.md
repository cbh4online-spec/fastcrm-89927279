

## Plano de Melhoria do Módulo RH — Reaproveitamento do Stack Existente

### Diagnóstico

O módulo RH tem **~15 páginas e ~22 hooks** mas não utiliza nenhuma das bibliotecas core do projecto:
- **0 formulários** com `react-hook-form` + `zod` (tudo `useState` manual, sem validação inline)
- **0 tabelas** com `DataTable` / `@tanstack/react-table` (tudo `<Table>` estático, sem sorting/filtros/paginação)
- **0 calendários** com `FullCalendar` (existe `FullCalendarAgenda` usado noutros módulos)
- **0 uploads** com `FileUpload` / `react-dropzone` (existe `FileUpload` reutilizável)
- **0 drag-and-drop** no Kanban de recrutamento (Kanban existe mas é estático; `@dnd-kit` usado em Leads e Helpdesk)

Componentes reutilizáveis **já existem** no projecto: `DataTable`, `FileUpload`, `FullCalendarAgenda`, padrões `@dnd-kit` em `LeadsKanbanDnD` e `TicketKanbanBoard`.

---

### Decisões Técnicas

| Decisão | Escolha |
|---------|---------|
| Schemas zod | 1 ficheiro por entidade em `src/schemas/hr/` |
| Form components | 5 wrappers RHF em `src/components/hr/form/` |
| Tabelas HR | Reutilizar `DataTable` existente, definir `columns` por entidade |
| Calendário HR | Reutilizar `FullCalendarAgenda`, criar adapter para eventos HR |
| Uploads HR | Reutilizar `FileUpload` existente |
| Kanban DnD | Adaptar padrão `@dnd-kit` de `LeadsKanbanDnD` |
| Exportação | Reutilizar `exceljs` + `jspdf` já instalados |

---

## P0 — Formulários Robustos (react-hook-form + zod)

### Componentes reutilizáveis a criar

**`src/components/hr/form/`**:
- `RHFormField.tsx` — wrapper `<FormField>` + `<Input>` com erro inline
- `RHSelectField.tsx` — wrapper `<FormField>` + `<Select>` 
- `RHDateField.tsx` — wrapper `<FormField>` + `<Input type="date">`
- `RHTextareaField.tsx` — wrapper `<FormField>` + `<Textarea>`
- `RHFormActions.tsx` — barra de acções padronizada (Cancelar / Guardar com loading)

### Schemas a criar

**`src/schemas/hr/`**:
- `employeeSchema.ts` — nome obrigatório, horas > 0, contrato válido, datas coerentes
- `departmentSchema.ts` — nome obrigatório, min 2 chars
- `positionSchema.ts` — nome obrigatório, salary_min < salary_max
- `leaveRequestSchema.ts` — employee + tipo + datas obrigatórias, start ≤ end
- `jobOpeningSchema.ts` — título obrigatório, salary_min < salary_max
- `candidateSchema.ts` — nome + apelido + email válido obrigatórios
- `onboardingTemplateSchema.ts` — template + employee obrigatórios

### Páginas a migrar

| Página | Ficheiro | Impacto |
|--------|----------|---------|
| Funcionários (edit) | `HREmployeesPage.tsx` | Dialog edit → RHF |
| Departamentos | `HRDepartmentsPage.tsx` | Dialog create/edit → RHF |
| Cargos | `HRPositionsPage.tsx` | Dialog create/edit → RHF |
| Ausências | `HRAbsencesPage.tsx` | Dialog create → RHF |
| Vagas | `JobOpeningsPage.tsx` | Dialog create → RHF |
| Candidatos | `CandidatesPage.tsx` | Dialog create → RHF |
| Onboarding | `HROnboardingPage.tsx` | Dialog start → RHF |
| Configurações | `HRSettingsPage.tsx` | CrudTable → RHF |

**Total P0**: ~8 schemas + 5 componentes form + 8 páginas migradas

---

## P1 — Tabelas, Calendário, Uploads, Exportação

### P1.1 — Tabelas com DataTable

Substituir `<Table>` manual por `<DataTable>` (já existente) com colunas tipadas:

| Página | Columns file |
|--------|-------------|
| Funcionários | `src/components/hr/columns/employeeColumns.tsx` |
| Departamentos | `src/components/hr/columns/departmentColumns.tsx` |
| Candidatos | `src/components/hr/columns/candidateColumns.tsx` |
| Entrevistas | `src/components/hr/columns/interviewColumns.tsx` |
| Ausências | `src/components/hr/columns/absenceColumns.tsx` |
| Sessões Ponto | `src/components/hr/columns/timeEntryColumns.tsx` |
| Vagas | `src/components/hr/columns/jobColumns.tsx` |

Cada ficheiro define `ColumnDef[]` com sorting, badges, acções. O `DataTable` já suporta pesquisa global, paginação, seleção e visibilidade de colunas.

### P1.2 — Calendário HR

Criar `src/components/hr/HRCalendarView.tsx` que reutiliza `FullCalendarAgenda`:
- Adapter que converte turnos, ausências, entrevistas e check-ins em `CalendarEvent[]`
- Cores por tipo (turno=azul, ausência=vermelho, entrevista=púrpura, check-in=verde)
- Filtros por colaborador e departamento
- Integrar em: `HRSchedulesPage`, `HRAbsencesPage`, `InterviewsPage`, `HRCheckinsPage`

### P1.3 — Uploads HR

Reutilizar `FileUpload` existente em:
- `CandidateDetailPage` — upload de CV (accept: pdf, doc)
- `HREmployeeDetailPage` — documentos do colaborador
- `HRAbsencesPage` — anexo justificativo
- `HROnboardingPage` — documentos de onboarding

### P1.4 — Exportação

Criar `src/utils/hrExportUtils.ts`:
- `exportEmployeesExcel/PDF`
- `exportAbsencesExcel/PDF`
- `exportAttendanceExcel/PDF`
- `exportCandidatesExcel/PDF`
- `exportInterviewsExcel/PDF`

Reutiliza `exceljs` (já em `excelUtils.ts`) e `jspdf` + `jspdf-autotable`. Adicionar botões de export nas páginas relevantes.

**Total P1**: ~7 column files + 1 calendar adapter + 4 upload integrations + 1 export utils + ~10 páginas alteradas

---

## P2 — Evolução e Diferenciação

### P2.1 — Kanban DnD (Recrutamento)

Refactoring de `CandidateKanban.tsx`:
- Adicionar `@dnd-kit/core` + `@dnd-kit/sortable` (padrão de `LeadsKanbanDnD`)
- Drag entre colunas persiste `stage` via `useUpdateCandidate`
- Cards com score IA, vaga, fonte
- Filtros por vaga, score, origem

### P2.2 — Onboarding Template Builder

Novo `OnboardingTaskReorder.tsx`:
- `@dnd-kit/sortable` para reordenar tarefas dentro de categorias
- Persistir `sort_order` no backend
- Feedback visual de arrasto

### P2.3 — Analytics HR

Melhorar `HRDashboardPage` com `recharts`:
- Headcount por departamento (bar chart)
- Tendência de ausências (line chart)
- Pipeline de recrutamento (funnel)
- Taxa de pontualidade (gauge)

**Total P2**: 2 componentes DnD + 4 charts + 1 página dashboard

---

### Ficheiros por prioridade (resumo)

**Criar** (~25 ficheiros):
- `src/schemas/hr/` — 7 schemas
- `src/components/hr/form/` — 5 componentes
- `src/components/hr/columns/` — 7 column definitions
- `src/components/hr/HRCalendarView.tsx`
- `src/utils/hrExportUtils.ts`
- `src/components/hr/OnboardingTaskReorder.tsx`

**Alterar** (~15 ficheiros):
- 8 páginas HR (P0 — forms)
- 7 páginas HR (P1 — tabelas + calendário + uploads)
- 3 componentes (P2 — kanban + dashboard)

### V1 vs V2

| V1 (este plano) | V2 (futuro) |
|------------------|-------------|
| Forms com zod | Multi-step wizard para onboarding |
| DataTable em todas as listas | Virtualização para >1000 rows |
| FullCalendar básico | Drag-and-drop de turnos no calendário |
| Upload de ficheiros | Gestão documental com versionamento |
| Export Excel/PDF básico | Templates de relatório personalizáveis |
| Kanban DnD simples | Automações de pipeline |
| Charts básicos dashboard | Dashboards customizáveis por utilizador |

### Critérios de Aceitação

1. Todos os formulários HR validados com zod, erros inline visíveis
2. Submit bloqueado em formulários inválidos
3. Todas as tabelas com sorting, pesquisa e paginação funcionais
4. Calendário mostra turnos + ausências + entrevistas com cores distintas
5. Upload funcional com drag-and-drop e validação de tipo/tamanho
6. Export Excel e PDF gera ficheiros correctos com dados filtrados
7. Kanban de recrutamento permite arrastar candidatos entre fases
8. Reorder de tarefas de onboarding persiste a ordem
9. Zero regressões em funcionalidades existentes

### Ordem de Implementação Sugerida

Dado o volume, recomendo implementar **por batches**:
1. **Batch 1**: Schemas + form components (fundação P0)
2. **Batch 2**: Migração dos 8 formulários (P0 completo)
3. **Batch 3**: Column definitions + migração tabelas (P1.1)
4. **Batch 4**: Calendário + Uploads + Exportação (P1.2-P1.4)
5. **Batch 5**: Kanban DnD + Onboarding reorder + Analytics (P2)

