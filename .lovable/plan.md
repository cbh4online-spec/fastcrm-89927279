
# Adicionar guarda `highlightMode` no `handleMouseUp`

## Alteração

Ficheiro `src/components/ebooks/FlipbookReader.tsx`, linha 294 — adicionar verificação de `highlightMode` logo após o check de `hasNotesFeature`:

```typescript
const handleMouseUp = useCallback(() => {
    if (!hasNotesFeature || !highlightMode) return;
    // ... resto da lógica
}, [hasNotesFeature, highlightMode]);
```

Isto garante que o popover de sublinhado só aparece quando o modo sublinhado está activamente ligado. Sem esta guarda, qualquer selecção de texto abre o popover mesmo em modo de leitura normal.

## Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookReader.tsx` | Adicionar `!highlightMode` ao early return + `highlightMode` às deps do `useCallback` |
