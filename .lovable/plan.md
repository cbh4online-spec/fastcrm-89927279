

# Correcao: Painel de outreach fecha ao voltar do Instagram

## Causa raiz identificada

O `WorkspaceInstanceContext` chama `setIsLoading(true)` toda vez que resolve a instancia do workspace (linha 169). O `resolveWorkspaceInstance` depende de `session?.access_token` (via `callControlPlane`). Quando o utilizador volta do Instagram, o Supabase pode fazer token refresh, o que muda `session.access_token`, recria `callControlPlane`, recria `resolveWorkspaceInstance`, e dispara o `useEffect`.

Quando `isLoading = true`, o `WorkspaceStatusGuard` desmonta TODOS os filhos (mostra spinner). Isto destroi o `ProfessionalProspecting` e todo o seu estado, incluindo `bulkOutreachOpen`.

```text
Token refresh ao voltar do Instagram
  -> session.access_token muda
  -> callControlPlane recria
  -> resolveWorkspaceInstance recria  
  -> useEffect dispara resolveWorkspaceInstance()
  -> setIsLoading(true)
  -> WorkspaceStatusGuard mostra spinner (desmonta filhos)
  -> ProfessionalProspecting desmontado (estado perdido)
  -> setIsLoading(false) 
  -> ProfessionalProspecting remontado (estado resetado)
```

## Solucao

### Ficheiro 1: `WorkspaceStatusGuard.tsx`

Mostrar o spinner de loading APENAS na primeira carga (quando nunca tivemos um status). Se ja temos um status resolvido, continuar a mostrar os filhos mesmo durante re-resolucao.

Isto evita desmontar filhos durante token refreshes.

### Ficheiro 2: `WorkspaceInstanceContext.tsx`

Nao chamar `setIsLoading(true)` se ja temos dados resolvidos (re-resolucao silenciosa). Usar um `hasResolved` ref para distinguir a primeira carga das subsequentes.

### Ficheiro 3: `BulkOutreachDialog.tsx`

Ja implementado: criacao automatica de lead no `handleConfirmSent`. Sem alteracoes necessarias — os leads ja estao a ser criados com sucesso (confirmado na base de dados: 5 leads recentes com source "professional_prospecting").

## Detalhes tecnicos

**WorkspaceInstanceContext.tsx**:
- Adicionar `const hasResolved = useRef(false)` 
- Em `resolveWorkspaceInstance`, so chamar `setIsLoading(true)` se `!hasResolved.current`
- No `finally`, fazer `hasResolved.current = true`
- Reset `hasResolved.current = false` quando `currentWorkspace?.id` muda (workspace diferente)

**WorkspaceStatusGuard.tsx**:
- Guardar o ultimo status resolvido: `const [lastStatus, setLastStatus] = useState(null)`
- Se `isLoading` E ja temos `lastStatus`, mostrar filhos (nao spinner)
- Se `isLoading` E nao temos `lastStatus`, mostrar spinner (primeira carga)

## Confirmacao: Lead automatica

A criacao automatica de lead ja funciona. Existem 5 leads recentes na base de dados com `source = "professional_prospecting"`. Nenhuma alteracao necessaria no `BulkOutreachDialog.tsx`.

## Resumo

| Ficheiro | Alteracao |
|---|---|
| `WorkspaceInstanceContext.tsx` | Nao fazer `setIsLoading(true)` em re-resolucoes |
| `WorkspaceStatusGuard.tsx` | Nao desmontar filhos durante re-resolucao |
| `BulkOutreachDialog.tsx` | Sem alteracoes (lead auto-create ja funciona) |
