

## Funcionários = Utilizadores do Workspace (com perfil HR)

### Diagnóstico

Actualmente, `hr_employees` é uma tabela independente — os funcionários são registos avulsos sem ligação aos utilizadores reais do sistema. O pedido é que **os funcionários sejam os próprios membros do workspace**, com a possibilidade de existirem utilizadores que só tenham acesso ao módulo de RH.

### Decisões de Produto

1. **Funcionários = `workspace_members`** — A página de funcionários mostra os membros do workspace, não uma tabela separada
2. **Dados HR como extensão** — Criar tabela `hr_employee_profiles` que estende `workspace_members` com campos específicos de RH (cargo, departamento, contrato, etc.)
3. **Nova role: `hr`** — Adicionar ao enum `workspace_role` para utilizadores que só acedem ao módulo de RH (ponto, férias, os seus dados)
4. **Eliminar `hr_employees`** — Migrar referências (time entries, shifts, absences) para usar `workspace_members.user_id` em vez de `hr_employees.id`

### Estrutura Técnica

**1. Migração SQL**

```text
workspace_members (existente)          hr_employee_profiles (nova)
┌──────────────────────┐              ┌──────────────────────────┐
│ id (uuid)            │              │ id (uuid)                │
│ workspace_id         │◄─────────────│ member_id (FK)           │
│ user_id              │              │ workspace_id (FK)        │
│ role (enum + 'hr')   │              │ job_title                │
│ created_at           │              │ department               │
└──────────────────────┘              │ employee_number          │
                                      │ contract_type            │
profiles (existente)                  │ start_date / end_date    │
┌──────────────────────┐              │ status (active/inactive) │
│ user_id              │              │ weekly_hours             │
│ full_name            │              │ qr_code_token            │
│ email                │              │ notes                    │
│ avatar_url           │              └──────────────────────────┘
└──────────────────────┘
```

- `ALTER TYPE workspace_role ADD VALUE 'hr'`
- Criar `hr_employee_profiles` com FK para `workspace_members(id)`
- Migrar dados de `hr_employees` existentes (se houver) para o novo modelo
- Actualizar FKs das tabelas dependentes (`hr_time_entries`, `hr_daily_summaries`, `hr_shift_assignments`, `hr_absences`) de `employee_id → hr_employees` para `member_id → workspace_members`
- RLS: membros podem ver perfis HR do seu workspace; apenas admin/owner podem editar

**2. Frontend — Refactor de Hooks**

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/hr/useHREmployees.ts` | Refazer: query `workspace_members` + JOIN `hr_employee_profiles` + `profiles` |
| `src/hooks/hr/useHREmployees.ts` | `useCreateHREmployee` → cria `hr_employee_profiles` para membro existente OU convida novo utilizador com role `hr` |
| `src/hooks/useTimeEntries.ts` | Já usa `user_id` — sem alteração necessária |

**3. Frontend — Página de Funcionários**

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/dashboard/hr/HREmployeesPage.tsx` | Reformular: listar membros do workspace com dados HR. Formulário "Novo Funcionário" passa a convidar/adicionar membro com role `hr` e criar perfil HR |
| `src/contexts/WorkspaceContext.tsx` | Adicionar `"hr"` ao tipo `WorkspaceRole` |
| `src/components/settings/sections/WorkspaceSettings.tsx` | Adicionar `hr: "Recursos Humanos"` aos labels e cores de role |
| `src/hooks/useWorkspaceMembers.ts` | Incluir `hr` no filtro de `useAgentMembers` se necessário |

**4. Frontend — Navegação para role `hr`**

- Utilizadores com role `hr` vêem apenas: Dashboard, O Meu Ponto, O Meu Perfil HR
- Restringir sidebar para role `hr` via `menu_permissions` ou lógica no manifest

### Critérios de Aceitação

1. Página de Funcionários mostra membros do workspace com dados HR
2. Adicionar funcionário = convidar utilizador com role `hr` + criar perfil HR
3. Utilizadores com role `hr` acedem ao sistema e vêem apenas módulos HR
4. Clock-in/out funciona com `user_id` (sem alteração)
5. Dados HR (cargo, departamento, contrato) editáveis no perfil do funcionário
6. Tabelas dependentes (turnos, ausências) migradas para o novo modelo

### Riscos

- **Migração de FKs**: As tabelas `hr_time_entries`, `hr_daily_summaries`, `hr_shift_assignments`, `hr_absences` referenciam `hr_employees(id)` — precisam ser migradas para `workspace_members(id)`
- **Dados existentes**: Se houver registos em `hr_employees`, precisam de ser mapeados a membros existentes ou novos
- **Role `hr` nas RLS**: Verificar que políticas existentes não excluem a nova role

