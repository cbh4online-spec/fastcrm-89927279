

## Diagnóstico: Tabela `hr_employees` vazia — nenhum módulo HR funciona

### Problema raiz
Existem **dois modelos de dados paralelos** que nunca foram sincronizados:

1. **Modelo antigo**: `workspace_members` + `hr_employee_profiles` — usado pela página de listagem de funcionários (`HREmployeesPage`)
2. **Modelo novo**: `hr_employees` — usado por **todos os outros módulos HR** (ponto, turnos, check-ins, férias, OKRs, feedback, avaliações)

A tabela `hr_employees` está **completamente vazia** (0 registos). Apesar de existir uma edge function `hr-employee-create`, **nunca é chamada** por nenhum componente. Jorge Cardoso existe em `profiles` mas não em `hr_employees`.

Consequência: ponto, turnos, check-ins, férias, OKRs — tudo vazio.

### Solução

Criar um mecanismo de sincronização automática que popule `hr_employees` a partir de `workspace_members` + `profiles`:

**Passo 1 — Migration SQL**: 
- Criar uma função `sync_workspace_member_to_hr_employee()` que, via trigger `AFTER INSERT` em `workspace_members`, cria automaticamente um registo em `hr_employees` com `user_id`, `workspace_id`, `full_name`, `email`
- Seed inicial: inserir em `hr_employees` todos os `workspace_members` existentes que ainda não tenham registo

**Passo 2 — Actualizar `HREmployeesPage`**:
- Manter a listagem actual (workspace_members + profiles) mas adicionar um botão/acção que chame a edge function `hr-employee-create` ou insira directamente em `hr_employees`, para garantir que quando se "cria" um funcionário HR, o registo existe na tabela correcta

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| Nova migration SQL | Trigger de sync + seed de membros existentes |
| `src/pages/dashboard/hr/HREmployeesPage.tsx` | Garantir que criação/edição de perfil HR também cria registo em `hr_employees` |

### Critérios de aceitação
1. Após migration, Jorge Cardoso aparece em `hr_employees`
2. Controlo de ponto mostra funcionários e permite clock-in/out
3. Novos workspace_members são automaticamente criados em `hr_employees`
4. Turnos, check-ins, férias e OKRs passam a mostrar funcionários

