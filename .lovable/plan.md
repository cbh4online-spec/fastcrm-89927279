

# Melhorar a Experiência de Edição de Texto no Editor de eBooks

## Diagnóstico

O editor WYSIWYG (`EbookRichEditor`) é um `contentEditable` div sem affordances visuais claras — não há borda, sombra de foco, nem tooltip a indicar que a área é editável. O utilizador gera conteúdo com IA mas não percebe que pode clicar directamente no texto para o editar.

### Problemas Identificados

1. **Sem indicação visual de editabilidade** — A área de texto parece conteúdo estático, não um campo editável
2. **Sem dica/tooltip ao hover** — Não há `cursor: text` visível nem mensagem "Clique para editar"
3. **Falta feedback ao focar** — Quando se clica na área, não há ring/borda a confirmar que se está em modo de edição
4. **Toolbar de formatação só aparece ao seleccionar texto** — Utilizador precisa saber que deve seleccionar texto antes de ver as opções
5. **Placeholder pouco visível** — O placeholder "Escreva o conteúdo..." só aparece quando o capítulo está vazio

## Plano de Implementação

### 1. `EbookRichEditor.tsx` — Melhorar affordances visuais

- Adicionar `cursor-text` ao div contentEditable
- Adicionar borda subtil + ring ao focar (`ring-1 ring-primary/20 border-primary/30`)
- Mostrar tooltip/hint persistente no topo do editor quando **não está em foco**: "Clique para editar o conteúdo"
- Quando está em foco, mostrar mini-hint: "Selecione texto para formatar · Ctrl+B negrito · Ctrl+I itálico"

### 2. `EbookEditor.tsx` — Adicionar indicação visual na área do editor

- Adicionar ícone de edição (pencil) subtil no canto superior direito da área do editor quando não está em foco
- Ao hover sobre a área, mostrar ligeira mudança de fundo (`bg-accent/5`) para sinalizar interactividade

### Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `EbookRichEditor.tsx` | cursor-text, focus ring, hint de edição, dicas de atalhos |
| `EbookEditor.tsx` | Indicador visual de editabilidade no wrapper do editor |

## Critérios de Aceitação

- Área do editor mostra `cursor: text` ao hover
- Ao focar, aparece ring/borda a confirmar modo de edição
- Hint visível quando editor não está em foco: "Clique para editar"
- Dicas de atalhos visíveis quando editor está em foco
- Funcionalidade de edição (typing, formatting, undo) mantém-se intacta
- Dark mode com contraste adequado

