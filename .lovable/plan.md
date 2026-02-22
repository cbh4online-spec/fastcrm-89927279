
# Corrigir: Dialog de outreach desaparece ao voltar do Instagram

## Problema

Quando o utilizador clica "Abrir DM", o Instagram abre num novo separador. Ao voltar ao FastCRM, o dialog de outreach em massa desapareceu porque:

1. **`refetchInterval` ainda activo**: Se a pesquisa foi feita ha menos de 30 segundos, a query faz polling a cada 3 segundos. Isto causa re-renders que podem perturbar o estado do dialog.
2. **Query invalidation em cascata**: O `onComplete` chama `invalidateQueries` que pode re-renderizar prematuramente.
3. **`window.open` com focus**: O `window.open(url, "_blank")` pode causar perda de focus que dispara comportamentos inesperados.

## Solucao

### Ficheiro 1: `ProspectingResults.tsx`

1. **Desactivar `refetchInterval` durante outreach**: Quando `bulkOutreachOpen === true`, desactivar tambem o `refetchInterval` (alem do `refetchOnWindowFocus` que ja foi corrigido):
```
refetchInterval: bulkOutreachOpen ? false : (searchId && (...) ? 3000 : false),
```

2. **Nao invalidar queries no `onComplete` imediatamente**: Mover o `invalidateQueries` para apos o dialog fechar, evitando re-renders durante o processo.

### Ficheiro 2: `BulkOutreachDialog.tsx`

1. **Usar `window.open` com nome de janela fixo**: Em vez de `"_blank"`, usar um nome fixo como `"instagram_dm"` para reutilizar a mesma janela/separador do Instagram:
```typescript
window.open(dmUrl, "instagram_dm");
```
Isto evita abrir multiplos separadores e reduz confusao.

2. **Adicionar `onPointerDownOutside` e `onEscapeKeyDown` mais restritivos**: Bloquear fecho por overlay e Escape em TODOS os cenarios durante a fase de envio (nao apenas quando `sentCount > 0`).

3. **Adicionar `onInteractOutside` para prevenir fecho**: Adicionar handler para `onInteractOutside` que previne fecho durante toda a fase de envio.

## Resumo das alteracoes

| Ficheiro | Alteracao |
|---|---|
| `ProspectingResults.tsx` | Desactivar `refetchInterval` durante outreach |
| `BulkOutreachDialog.tsx` | Usar janela nomeada para Instagram; bloquear fecho mais agressivamente durante envio |
