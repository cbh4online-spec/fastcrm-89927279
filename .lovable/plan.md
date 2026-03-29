

# Corrigir layout do editor de eBooks

## Problema

O editor tem 3 colunas em flex, mas a coluna central não tem `min-w-0`, causando overflow do conteúdo para cima da barra lateral direita. Além disso, o texto do editor pode estar invisível por conflito de cores do tema escuro com as classes `prose`.

## Alterações

### `EbookEditor.tsx`

1. **Coluna central (linha 453)**: Adicionar `min-w-0` ao `flex-1` para impedir overflow flex
2. **Editor wrapper (linha 532)**: Adicionar `bg-white text-slate-900 rounded-lg shadow` ao container do editor para garantir fundo branco e texto visível independentemente do tema
3. **Right sidebar**: Mover o `EbookBlockToolbar` para dentro de um `overflow-y-auto` para evitar que tome altura infinita — remover o wrapper `shrink-0` redundante

### `EbookRichEditor.tsx`

4. Adicionar classes explícitas de cor ao `contentEditable` div: `text-slate-900` e `prose-p:text-slate-900 prose-headings:text-slate-900` para garantir visibilidade em qualquer tema

| Ficheiro | Alteração |
|---|---|
| `EbookEditor.tsx` | `min-w-0` na coluna central, fundo branco no editor, fix sidebar overflow |
| `EbookRichEditor.tsx` | Cores explícitas no texto editável |

