

# Fix: Pesquisa de empresas no selector de propostas

## Diagnóstico

O `ClientSearchSelect` usa `cmdk` v1.1.1 dentro de um `Popover`. Com `shouldFilter={false}`, o `CommandInput` pode não receber foco correctamente quando o popover abre, impedindo o utilizador de digitar para pesquisar.

Problema adicional: em cmdk v1.x, o `CommandInput` dentro de Popover pode perder eventos de teclado se o foco não for explicitamente dado ao input.

## Solução

No `ClientSearchSelect.tsx`:

1. **Auto-focus no input** — Adicionar ref ao `CommandInput` e fazer `focus()` quando o popover abre (via `useEffect` no estado `open`)
2. **Garantir que `onOpenAutoFocus` do PopoverContent não bloqueia** — Prevenir o comportamento default do Popover que pode roubar foco do input

## Ficheiro alterado

| Ficheiro | Alteração |
|---|---|
| `src/components/proposals/ClientSearchSelect.tsx` | Adicionar `useRef` + `useEffect` para auto-focus no `CommandInput` quando popover abre; adicionar `onOpenAutoFocus={(e) => e.preventDefault()}` no `PopoverContent` para evitar conflito de foco |

## Alteração concreta

```tsx
// Adicionar ref
const inputRef = useRef<HTMLInputElement>(null);

// Auto-focus quando abre
useEffect(() => {
  if (open) {
    setTimeout(() => inputRef.current?.focus(), 0);
  }
}, [open]);

// No PopoverContent: onOpenAutoFocus={(e) => e.preventDefault()}
// No CommandInput: ref={inputRef}
```

