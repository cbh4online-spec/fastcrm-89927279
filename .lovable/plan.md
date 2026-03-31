

## Diagnóstico: Departamento criado mas não aparece na lista

### Problema
O departamento existe na base de dados (confirmado via query directa) com o `workspace_id` correcto. As políticas RLS permitem SELECT para membros do workspace. O problema está no lado do cliente.

### Causa Provável
A query do Supabase com joins relacionais (`head:hr_employees`, `parent:hr_departments`) pode estar a falhar silenciosamente. Com 0 registos em `hr_employees` neste workspace, o PostgREST pode ter problemas com a resolução do FK hint no self-join combinado com o join a `hr_employees`. O erro é engolido pelo React Query e a lista fica vazia.

### Plano (1 passo)

#### 1. Robustez na query e debug
- No `useHRDepartments`, adicionar `console.error` no `queryFn` catch para capturar erros silenciosos
- Simplificar a query: em vez de usar joins na query principal, fazer primeiro um `select("*")` simples e depois enriquecer com joins apenas se necessário
- Alternativamente, usar a sintaxe `!inner` invertida: manter os joins mas torná-los explicitamente opcionais adicionando tratamento de erro mais visível

**Abordagem concreta**: Adicionar logging na query e, se confirmar erro nos joins, separar a query base da resolução de relações.

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/hooks/hr/useHRDepartments.ts` | Adicionar console.log/error para debug + simplificar query se necessário |

### Critério de Aceitação
1. Departamento criado aparece imediatamente na lista
2. KPIs actualizam com valores correctos

