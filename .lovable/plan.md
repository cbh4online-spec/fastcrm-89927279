

# Corrigir espaço a avançar página durante escrita de notas

## Alteração única

**Ficheiro**: `src/components/ebooks/FlipbookReader.tsx`, linhas 376-378

Substituir:
```typescript
const handler = (e: KeyboardEvent) => {
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); flipNext(); }
  if (e.key === "ArrowLeft") { e.preventDefault(); flipPrev(); }
};
```

Por:
```typescript
const handler = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement)?.tagName;
  const isEditable = (e.target as HTMLElement)?.isContentEditable;
  if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) return;
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); flipNext(); }
  if (e.key === "ArrowLeft") { e.preventDefault(); flipPrev(); }
};
```

Isto impede que teclas de navegação (espaço, setas) sejam capturadas quando o utilizador está a escrever num campo de texto ou nota.

