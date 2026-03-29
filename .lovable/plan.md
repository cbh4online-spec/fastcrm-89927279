

# Indicador visual de highlights nas páginas do flipbook

## Diagnóstico

Os highlights são guardados como notas (`note_type: "highlight"`) com `highlight_text` e `highlight_color`, mas actualmente só aparecem no painel lateral. O texto sublinhado não é visualmente marcado na própria página do flipbook.

## Abordagem

Injectar marcações visuais no conteúdo das páginas `type: "content"`, fazendo match do `highlight_text` guardado contra o texto renderizado e aplicando um `<mark>` com a cor correspondente.

## Alterações

### 1. `FlipbookReader.tsx`
- Agrupar highlights por página: `Map<number, { text: string; color: string }[]>`
- Passar array de highlights da página actual para cada `PageWrapper` via nova prop `highlights`

### 2. `PageFlip.tsx` (PageWrapper)
- Aceitar e propagar nova prop `highlights` para `FlipbookPage`

### 3. `FlipbookPage.tsx`
- Nova prop opcional `highlights?: { text: string; color: string }[]`
- Função utilitária `applyHighlights(content: string, highlights)` que:
  - Para **HTML**: faz `replace` no texto (fora de tags) wrapping matches em `<mark style="background:color;...">text</mark>`
  - Para **Markdown**: aplica o mesmo replace no texto antes de passar ao ReactMarkdown (ou pós-render via wrapper)
- Aplicar apenas em páginas `type: "content"`
- Estilo do mark: cor de fundo com 40% opacidade, border-bottom sólido, border-radius subtil

### 4. Estilo visual do highlight
- `background-color` com opacidade (ex: `${color}66`)
- `border-bottom: 2px solid ${color}`
- `border-radius: 2px`
- `padding: 0 2px`
- Tooltip on hover mostrando "Sublinhado" (opcional, via `title`)

| Ficheiro | Acção |
|---|---|
| `FlipbookPage.tsx` | Adicionar prop `highlights`, função `applyHighlights`, renderizar marks no conteúdo |
| `PageFlip.tsx` | Propagar prop `highlights` |
| `FlipbookReader.tsx` | Construir mapa de highlights por página e passá-lo aos componentes |

## Critérios de aceitação
- Highlights existentes visíveis directamente no texto das páginas
- Cor do highlight corresponde à cor guardada na nota
- Funciona tanto com conteúdo HTML como Markdown
- Não interfere com a navegação do flipbook nem com links
- Performance aceitável (replace é O(n) por página, sem impacto visível)

