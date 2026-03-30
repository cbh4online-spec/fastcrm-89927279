

# Editor Visual de Páginas — Estilo Website Builder

## Diagnóstico

O editor actual usa um único `contentEditable` div por capítulo, onde o conteúdo é HTML plano. Não há conceito de "blocos" independentes — tudo vive dentro de um blob de HTML. Isto impede selecção individual de elementos, reordenação por drag-and-drop e edição de propriedades por bloco.

Para chegar a um editor tipo Hostinger/Wix, o conteúdo de cada capítulo precisa migrar de `string` para uma **lista de blocos estruturados**, cada um com tipo, conteúdo, layout e estilos próprios.

## Arquitectura Proposta

```text
EbookChapter
├── title
├── layout: "single" | "two-col" | "hero-image" | "text-image-split" | ...
└── blocks: ContentBlock[]
       ├── id
       ├── type: "heading" | "paragraph" | "image" | "quote" | "divider" | "list" | "cta" | "table" | "columns"
       ├── content: string (HTML ou texto)
       ├── children?: ContentBlock[] (para colunas)
       └── styles: { padding, margin, bgColor, textColor, fontSize, fontWeight, borderRadius, border, shadow, textAlign, ... }
```

## Plano de Implementação

### 1. Actualizar modelo de dados (`useEbooks.ts`)

- Criar interface `ContentBlock` com `id`, `type`, `content`, `children`, `styles`
- Criar interface `BlockStyles` com todas as propriedades CSS editáveis
- Adicionar campo `blocks?: ContentBlock[]` ao `EbookChapter`
- Manter `content: string` para retrocompatibilidade (capítulos antigos sem blocos)

### 2. Criar componente `EbookVisualBlock` (novo ficheiro)

Cada bloco é renderizado como um componente seleccionável:
- Borda visível no hover, highlight azul quando seleccionado
- Handles de drag no canto superior esquerdo
- Toolbar flutuante ao seleccionar (mover cima/baixo, duplicar, eliminar)
- Conteúdo editável inline (contentEditable dentro do bloco)
- Badge de tipo no canto (H1, Imagem, Citação, etc.)

### 3. Criar componente `EbookPageCanvas` (novo ficheiro)

Substitui o `EbookRichEditor` quando o capítulo tem blocos:
- Renderiza a lista de `ContentBlock[]` ordenada
- Suporta layouts de página (coluna única, 2 colunas, hero + texto, etc.)
- Drag-and-drop entre blocos via arrastar handles
- Zona de drop "Adicionar bloco aqui" entre blocos
- Preview visual fiel ao resultado final

### 4. Criar painel `BlockPropertiesPanel` (novo ficheiro)

Na sidebar direita, nova tab "Propriedades" que aparece quando um bloco está seleccionado:
- **Espaçamento**: padding (4 lados), margin (4 lados) — sliders
- **Cores**: cor de fundo, cor do texto — color pickers
- **Tipografia**: tamanho de fonte, peso, line-height — selects
- **Bordas**: espessura, cor, radius — inputs
- **Sombra**: presets (none, soft, medium, hard)
- **Alinhamento**: horizontal (left, center, right, justify)
- **Layout** (para bloco coluna): gap, direcção

### 5. Criar selector de layout de página (novo componente)

Na toolbar do capítulo, botão "Layout" que abre grid visual:
- **Coluna única** (default)
- **2 Colunas** (50/50 ou 60/40 ou 40/60)
- **Hero + Texto** (imagem topo, texto baixo)
- **Texto + Imagem** (lado a lado)
- **3 Colunas** (highlights)

Cada layout define zonas onde os blocos são colocados.

### 6. Migração de conteúdo existente

Função `migrateContentToBlocks(content: string): ContentBlock[]`:
- Parseia o HTML existente
- Converte cada tag de nível superior num `ContentBlock`
- Preserva formatação inline dentro de cada bloco
- Executada automaticamente na primeira vez que um capítulo antigo é aberto no novo editor

### 7. Actualizar `EbookEditor.tsx`

- Trocar `EbookRichEditor` por `EbookPageCanvas` no centro
- Adicionar tab "Propriedades" na sidebar direita (condicional — só aparece com bloco seleccionado)
- Manter retrocompatibilidade: se `chapter.blocks` não existe, usar `EbookRichEditor` legacy
- Estado `selectedBlockId` para coordenar canvas ↔ properties panel

### 8. Actualizar `EbookBlockToolbar.tsx`

Em vez de inserir HTML bruto, cada botão cria um `ContentBlock` com estilos default e adiciona-o à lista de blocos do capítulo activo.

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/hooks/useEbooks.ts` | Adicionar `ContentBlock`, `BlockStyles` interfaces |
| `src/components/ebooks/EbookVisualBlock.tsx` | **Novo** — bloco visual seleccionável/arrastável |
| `src/components/ebooks/EbookPageCanvas.tsx` | **Novo** — canvas de página com layout + blocos |
| `src/components/ebooks/BlockPropertiesPanel.tsx` | **Novo** — painel de propriedades CSS por bloco |
| `src/components/ebooks/PageLayoutSelector.tsx` | **Novo** — selector visual de layout de página |
| `src/components/ebooks/EbookEditor.tsx` | Integrar canvas, properties panel, estado de selecção |
| `src/components/ebooks/EbookBlockToolbar.tsx` | Criar `ContentBlock` em vez de HTML strings |

## Critérios de Aceitação

- Cada elemento da página é individualmente seleccionável com feedback visual
- Blocos podem ser reordenados por drag-and-drop
- Painel lateral mostra todas as propriedades CSS do bloco seleccionado
- Alterações de propriedades reflectem-se em tempo real no canvas
- Layouts de página funcionam (2 colunas, hero, etc.)
- Capítulos existentes migram automaticamente para o sistema de blocos
- O flipbook reader continua a renderizar correctamente

## Riscos

- **Renderização no FlipbookReader**: precisa de ser actualizado para renderizar `ContentBlock[]` em vez de HTML bruto
- **Performance com muitos blocos**: limitar re-renders com `React.memo`
- **Migração de conteúdo**: parsing de HTML arbitrário pode falhar em edge cases — prever fallback

