

# Fix: Auto-gerar mensagem ao abrir o dialog

## Problema

O dialog "Gerar Mensagem IA" tem logica de auto-geracao em `handleOpenChange`, mas esta funcao so e chamada quando o utilizador interage com o dialog (fechar). Quando o dialog abre pela primeira vez (via prop `open=true` do componente pai), a mensagem nao e gerada automaticamente.

## Solucao

No ficheiro `src/components/professional-prospecting/ProspectingMessageDialog.tsx`:

1. Adicionar um `useEffect` que detecta quando `open` muda para `true` e dispara `generateMessage()` automaticamente
2. Remover a logica duplicada de auto-generate do `handleOpenChange`

### Alteracao tecnica

Adicionar ao componente:

```typescript
useEffect(() => {
  if (open && !hasGenerated && !isGenerating) {
    generateMessage();
  }
  if (!open) {
    setMessage("");
    setHasGenerated(false);
    setCopied(false);
  }
}, [open]);
```

E simplificar `handleOpenChange` para apenas delegar ao `onOpenChange`.

### Ficheiro a modificar:
- `src/components/professional-prospecting/ProspectingMessageDialog.tsx` -- adicionar useEffect, simplificar handleOpenChange

