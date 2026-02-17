

# Fix: Preview não faz scroll

## Problema
O `ScrollArea` no preview do telefone usa `maxHeight: 680px` com `className="h-full"`, mas o container pai não tem uma altura fixa explícita. Sem uma altura fixa real no `ScrollArea`, o componente expande em vez de activar o scroll interno.

## Solução
Substituir `maxHeight` por `height` fixo no `ScrollArea`, para que o conteúdo que exceda esse limite active o scroll correctamente.

## Alteração

### Ficheiro: `src/components/bio/BioBlockEditor.tsx`

**Linha 194** -- Mudar o estilo do `ScrollArea`:

De:
```tsx
<ScrollArea className="h-full" style={{ maxHeight: previewMode === "mobile" ? 680 : 500 }}>
```

Para:
```tsx
<ScrollArea style={{ height: previewMode === "mobile" ? 680 : 500 }}>
```

Isto garante que o `ScrollArea` tem uma altura fixa e o conteúdo interno faz scroll quando ultrapassa esse limite.

