

# Fix: Texto invisível no Editor de eBooks

## Diagnóstico

O `EbookRichEditor.tsx` usa cores hardcoded `text-slate-900` em todos os elementos de texto (headings, parágrafos, listas, strong). No dark mode, isto resulta em texto quase preto sobre fundo escuro — invisível.

O editor content area (`bg-background`) herda o tema dark, mas o texto está fixo em slate-900.

## Correção

**Ficheiro:** `src/components/ebooks/EbookRichEditor.tsx` (linhas 241-254)

Substituir todas as referências `text-slate-900` e `text-slate-500` por tokens do tema:

| De | Para |
|---|---|
| `text-slate-900` (div, headings, p, strong, li) | `text-foreground` |
| `text-slate-500` (blockquote) | `text-muted-foreground` |

A classe `prose` do Tailwind também injeta cores — precisamos de `prose-invert` no dark mode OU usar `dark:prose-invert` para compatibilidade automática. Mas como estamos a usar classes explícitas por elemento (`prose-p:`, `prose-headings:`), basta trocar os tokens.

### Resultado
- Texto visível em ambos os temas (light e dark)
- Zero alteração funcional — apenas tokens CSS
- Mantém hierarquia visual existente

