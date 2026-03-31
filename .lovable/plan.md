

## Correcção: `useHREmployees is not defined` em HRTimeTrackingPage

### Diagnóstico
O ficheiro `HRTimeTrackingPage.tsx` que vejo no código-fonte parece correcto (usa `useHREmployeesList`), mas o runtime ainda reporta `useHREmployees is not defined` na linha 42. Isto indica que a edição anterior pode não ter sido aplicada completamente, ou existe uma referência residual a `useHREmployees` que não aparece no ficheiro actual.

### Solução
Reescrever o ficheiro `HRTimeTrackingPage.tsx` para garantir que:
1. O import é `useHREmployeesList` de `@/hooks/hr/useCheckins`
2. Não existe nenhuma referência a `useHREmployees` no ficheiro
3. Forçar refresh do módulo

### Ficheiro a alterar

| Ficheiro | Acção |
|---|---|
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Reescrever para eliminar qualquer referência residual a `useHREmployees` |

### Critério de Aceitação
- Página de Controlo de Ponto carrega sem erro

