

# Associar Tarefa a Contacto, Lead ou Empresa

## O que muda

Adicionar ao diálogo "Nova Tarefa" (`CreateTaskDialog.tsx`) um campo de associação que permite escolher o tipo de entidade (Contacto, Lead, Empresa) e pesquisar/selecionar o registo específico.

## Como funciona

1. **Novo campo "Associar a"** — aparece depois da Prioridade, antes da Data Limite:
   - Dropdown para selecionar tipo: Contacto, Lead, Empresa (ou "Geral" = sem associação)
   - Ao selecionar um tipo, aparece um campo de pesquisa com autocomplete que busca registos da tabela respectiva (`contacts`, `leads`, `companies`)
   - O registo selecionado mostra nome + badge do tipo

2. **Alteração na interface `onCreateTask`** — passar `related_type` e `related_id` no objecto de criação (o hook `useCreateTask` já suporta estes campos)

3. **Pesquisa de entidades** — query simples com `.ilike('name', '%term%')` limitada a 10 resultados, executada com debounce de 300ms

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/tasks/CreateTaskDialog.tsx` | Adicionar selector de tipo + campo de pesquisa de entidade com autocomplete |
| `src/pages/TasksPage.tsx` | Passar `related_type` e `related_id` do dialog para o `createTask.mutateAsync` |

Não são necessárias alterações na base de dados — a tabela `tasks` já tem as colunas `related_type` e `related_id`.

