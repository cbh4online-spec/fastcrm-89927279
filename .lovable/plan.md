

# Módulo de Tarefas — Upgrade Funcional e Proativo

## Problema Atual
A página de Tarefas (`TasksPage.tsx`) é extremamente básica — apenas uma lista + botão criar. Enquanto isso, existem **5 componentes ricos** já construídos que **não estão integrados**:
- `TaskAISuggestions` (sugestões IA com mock data)
- `TaskProductivityStats` (stats de produtividade)
- `TaskQuickActions` (ações rápidas)
- `TaskTemplateSelector` (templates)
- `EntityTasksSection` (usa tudo, mas só em fichas de entidades)

O módulo também não tem: filtros, edição real, vista kanban, alertas proativos, nem contexto de entidades.

---

## Plano de Implementação

### 1. Rebuild da TasksPage — Layout Completo
Transformar a página num hub de produtividade com layout sidebar:

```text
┌─────────────────────────────────────────────────┐
│ [⚠️ 3 tarefas atrasadas — ver agora]           │  ← Banner proativo
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │  CONTEÚDO PRINCIPAL                  │
│          │                                      │
│ Filtros  │  [Foco Hoje] 4 tarefas prioritárias  │
│ • Status │  ┌─────────────────────────────────┐ │
│ • Data   │  │ ☐ Follow up deal prioritário    │ │
│ • Entid. │  │   🏢 Empresa X · ⏰ Hoje        │ │
│ • Atrib. │  └─────────────────────────────────┘ │
│          │                                      │
│ Stats    │  [Lista] [Kanban] ← Toggle de vista  │
│ • 12 pend│  ┌──────┬──────┬──────┬──────┐      │
│ • 3 atras│  │ Hoje │Semana│Próx. │Futuro│      │
│ • 85% tx │  └──────┴──────┴──────┴──────┘      │
│          │                                      │
│ Quick    │  [Sugestões IA] [Templates]           │
│ Actions  │  Recomendações contextuais            │
└──────────┴──────────────────────────────────────┘
```

### 2. Componentes a Integrar/Criar

**Integrar (já existem):**
- `TaskProductivityStats` → sidebar
- `TaskQuickActions` → sidebar
- `TaskAISuggestions` → tab/secção no conteúdo
- `TaskTemplateSelector` → acessível via botão

**Criar novos:**

| Componente | Descrição |
|---|---|
| `TasksFilterSidebar.tsx` | Filtros: status, prioridade, data, entidade, atribuído |
| `TaskKanbanView.tsx` | Vista kanban com colunas temporais (Hoje, Semana, Próxima, Futuro) |
| `TaskOverdueBanner.tsx` | Banner de alerta no topo com contagem e ação rápida |
| `TaskTodayFocus.tsx` | Secção "Foco de Hoje" com tarefas do dia priorizadas |
| `EditTaskDialog.tsx` | Dialog completo de edição (título, notas, prioridade, data, atribuição) |

**Modificar:**

| Ficheiro | Mudança |
|---|---|
| `TasksPage.tsx` | Rebuild total — layout sidebar + conteúdo multi-vista |
| `TaskList.tsx` | Adicionar checkbox bulk, mostrar nome da entidade relacionada, link navegável |
| `useTasks.ts` | Hook não precisa de mudanças (já suporta filtros) |

### 3. Funcionalidades Proativas

- **Banner de atrasadas**: Alerta vermelho no topo com "3 tarefas atrasadas — agir agora"
- **Foco de hoje**: Secção destacada com as tarefas do dia ordenadas por prioridade
- **Contexto de entidade**: Cada tarefa mostra "🏢 Empresa X" ou "👤 Lead Y" com link
- **Stats em tempo real**: Sidebar com taxa de conclusão, streak, progresso do dia
- **Sugestões IA**: Integradas na página principal (não escondidas)

### 4. Vista Kanban
Colunas baseadas em temporalidade:
- **Atrasadas** (vermelho) — past due
- **Hoje** (âmbar) — due today
- **Esta Semana** — due this week
- **Próxima Semana** — due next week
- **Futuro** — everything else
- **Sem Data** — no due date

### 5. Bulk Operations
- Checkbox em cada tarefa para seleção múltipla
- Barra de ações flutuante: "Concluir (3)", "Eliminar (3)", "Atribuir (3)"

### 6. Edição Completa
O `onEdit` atual é um no-op (`() => {}`). Criar `EditTaskDialog` com:
- Título, notas/descrição, prioridade (alta/média/baixa)
- Data limite com quick dates
- Atribuição a membros do workspace
- Entidade relacionada (read-only context)

---

## Ordem de Implementação
1. **Banner + Foco Hoje + Sidebar** — impacto proativo imediato
2. **Filtros + contexto de entidade** — usabilidade
3. **Edit dialog** — funcionalidade básica em falta
4. **Kanban view** — diferenciação visual
5. **Bulk actions** — produtividade avançada

