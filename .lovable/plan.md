

## Atribuição de Responsável nas Tarefas — Plano

### Diagnóstico

- A tabela `tasks` já tem o campo `assigned_to` (UUID, nullable)
- O hook `useUpdateTask` já suporta `assigned_to` e emite evento `TASK.ASSIGNED`
- O `EditTaskDialog` **não** expõe este campo — só edita título e data
- O `handleEditSave` no `TasksPage.tsx` só passa `title` e `due_at`
- O projecto já tem `useWorkspaceMembers()` com perfis (nome, email, avatar) — usado em 27+ ficheiros
- Também já existe `useAgentMembers()` para subconjuntos

### Plano

**1. Alterar `EditTaskDialog.tsx`**
- Adicionar estado `assignedTo` (inicializado a partir de `task.assigned_to`)
- Adicionar secção "Responsável" com dropdown/combobox dos workspace members
- Usar `useWorkspaceMembers()` para listar opções
- Mostrar avatar + nome, com opção "Sem responsável"
- Incluir `assigned_to` no `onSave`

**2. Alterar interface `EditTaskDialogProps`**
- Expandir tipo de `onSave` para incluir `assigned_to?: string | null`

**3. Alterar `TasksPage.tsx`**
- Actualizar `handleEditSave` para passar `assigned_to` ao `updateTask.mutateAsync`

### Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/tasks/EditTaskDialog.tsx` | Adicionar campo de atribuição com combobox de workspace members |
| `src/pages/TasksPage.tsx` | Expandir `handleEditSave` para incluir `assigned_to` |

### UX
- Select com avatar + nome do membro
- Opção "Sem responsável" para limpar atribuição
- Posicionado entre Prioridade e Data Limite no dialog
- Consistente com o padrão usado em `EntityOwnerSelector` e `AgentAssignDropdown`

