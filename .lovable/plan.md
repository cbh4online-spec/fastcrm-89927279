
# Problema: Rota `/dashboard/tasks` não existe

## Diagnóstico

O dashboard e o widget "Minhas Tarefas" navegam para `/dashboard/tasks`, mas essa rota **nunca foi registada** no router (`src/App.tsx`). Resultado: 404 imediato.

Locais que causam o problema:
- `src/pages/Dashboard.tsx` → linhas 565, 566, 582 (`navigate("/dashboard/tasks")`)
- `src/components/dashboard/MyTasksWidget.tsx` → linha 112 (`navigate("/dashboard/tasks")`)

Todos os componentes necessários já existem:
- `TaskList` — lista com tabs pendentes/concluídas
- `CreateTaskDialog` — criação de tarefas
- `useTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useToggleTaskStatus` — hooks completos

## Solução

### 1. Criar `src/pages/TasksPage.tsx`

Uma página dedicada com `DashboardLayout` que:
- Mostra o header "Minhas Tarefas" com contador de pendentes e botão "Nova Tarefa"
- Usa filtros por estado (pendentes / concluídas) e por data
- Reutiliza `TaskList` para renderizar
- Usa `CreateTaskDialog` para criar tarefas globais (sem `related_type`/`related_id` obrigatório)
- Suporta query param `?selected=<id>` para destacar uma tarefa específica (vindo do dashboard widget)

### 2. Registar a rota em `src/App.tsx`

Adicionar uma linha na secção "Main Routes":

```
<Route path="/dashboard/tasks" element={<TasksPage />} />
```

## Ficheiros a alterar

| Ficheiro | Ação |
|---|---|
| `src/pages/TasksPage.tsx` | Criar (novo) |
| `src/App.tsx` | Adicionar rota (1 linha) |

## Technical Details

- Não são necessárias alterações à base de dados — as tabelas e RLS já existem.
- O `CreateTaskDialog` recebe `entityName` como prop obrigatória — na página global será passado `"Geral"`.
- O hook `useTasks` sem filtros de `related_type`/`related_id` devolve todas as tarefas do workspace, que é o comportamento correto para esta vista global.
- O parâmetro `?selected=<id>` será lido via `useSearchParams` para permitir scroll/highlight da tarefa específica quando o utilizador vem do widget do dashboard.
