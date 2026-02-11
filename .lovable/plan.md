

# Corrigir Modulos Instalados que Nao Aparecem

## Problema

O hook `useWorkspaceModules` usa `useState` + `useEffect` com fetch manual. Cada componente que o chama (Sidebar, Marketplace, ModuleGuard, etc.) cria a sua propria copia independente do estado. Quando o Marketplace instala um modulo e chama `fetchInstalledModules()`, so o estado local do Marketplace e atualizado. O Sidebar mantem dados antigos ate o utilizador fazer refresh da pagina.

## Solucao

Migrar o `useWorkspaceModules` para usar **React Query**, que partilha automaticamente a cache entre todos os componentes que usam a mesma query key. Quando o Marketplace instala/desinstala um modulo, faz `invalidateQueries` e todos os consumidores (Sidebar, ModuleGuard, etc.) recebem os dados atualizados instantaneamente.

## Seccao Tecnica

### Ficheiro: `src/hooks/useWorkspaceModules.ts`

Reescrever o hook para:

1. Substituir `useState` + `useEffect` + `useCallback` por `useQuery` do React Query
2. A query key sera `["workspace-modules", workspaceId]`
3. A funcao de fetch mantem-se igual (buscar `workspace_modules` + `marketplace_modules` para slugs)
4. `installModule` e `uninstallModule` passam a usar `useMutation` com `onSuccess` que chama `queryClient.invalidateQueries(["workspace-modules", workspaceId])`
5. `installedModuleIds` e `installedModules` passam a ser derivados (`useMemo`) do resultado da query
6. A interface publica do hook mantem-se identica para nao quebrar nenhum consumidor

Resultado: instalar ou desinstalar um modulo no Marketplace atualiza automaticamente o Sidebar, ModuleGuard e qualquer outro componente que use o hook.

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useWorkspaceModules.ts` | Migrar de useState/useEffect para React Query (useQuery + useMutation) para partilha automatica de estado |

