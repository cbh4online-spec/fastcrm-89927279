

## Corrigir Página de Funcionários — Erro PGRST200

### Diagnóstico

O erro é `PGRST200`: PostgREST não encontra FK entre `hr_employees.user_id` e `profiles`. A query actual tenta fazer `profiles:user_id(full_name, email, avatar_url)` mas essa FK não existe no schema.

A tabela `hr_employees` já tem colunas `full_name`, `email`, `avatar_url` directamente — não precisa de join com `profiles`.

### Solução

**Ficheiro único**: `src/hooks/hr/useHREmployees.ts`

1. **Remover o join `profiles:user_id(...)`** da query em `useHREmployees` e `useHREmployee`
2. Usar directamente `e.full_name`, `e.email`, `e.avatar_url` do próprio `hr_employees`
3. Manter os joins relacionais que funcionam: `hr_departments`, `hr_job_titles`, `manager`

**Query corrigida:**
```typescript
.select(`
  *,
  hr_departments!hr_employees_department_id_fkey(id, name),
  hr_job_titles:position_id(id, name),
  manager:manager_id(id, full_name)
`)
```

**Mapeamento corrigido** (linhas 65-92 e 119-147):
- `full_name: e.full_name || "Sem nome"` (sem fallback para profiles)
- `email: e.email || null`
- `avatar_url: e.avatar_url || null`

### Impacto
- Zero alterações na página `HREmployeesPage.tsx` (já consome os campos correctos do tipo `HREmployee`)
- Zero alterações na base de dados
- Resolve o erro PGRST200 e os funcionários passam a aparecer

