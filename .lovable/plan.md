

# Corrigir espaço a avançar página durante escrita de notas

## Diagnóstico

Em `FlipbookReader.tsx` linha 377, o handler de teclado global captura a tecla espaço (`" "`) para avançar página. Este handler não verifica se o foco está num campo de texto, causando o conflito.

## Alteração

Ficheiro `src/components/ebooks/FlipbookReader.tsx`, linha 376-378 — adicionar guarda que ignora o evento quando o foco está num `input`, `textarea` ou elemento `contentEditable`:

```typescript
const handler = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement)?.tagName;
  const isEditable = (e.target as HTMLElement)?.isContentEditable;
  if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) return;

  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); flipNext(); }
  if (e.key === "ArrowLeft") { e.preventDefault(); flipPrev(); }
};
```

## Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookReader.tsx` | Adicionar guarda de foco no handler de teclado global |

