

# eBook Editor — Funcionalidades Gamma-style

## Resumo

Transformar o editor atual (Textarea + Markdown) num editor visual WYSIWYG com sidebar de ferramentas, thumbnails de páginas, toolbar inline e modo apresentação — como o Gamma.

---

## Funcionalidades a construir

### 1. Editor Rich Text (WYSIWYG)
Substituir o `<Textarea>` atual por um editor `contentEditable` baseado no `RichTextEditor` que já existe no projeto (em `email-builder/`). O conteúdo passa de Markdown para HTML internamente.

- Reutilizar padrão `contentEditable` + `document.execCommand` já existente
- Suporte para: headings (H1-H3), bold, italic, underline, listas, links, imagens inline
- Converter conteúdo Markdown existente para HTML na migração

### 2. Sidebar direita — Toolbar de blocos de conteúdo
Painel lateral direito com ícones para inserir elementos (como no Gamma):

| Ícone | Bloco |
|-------|-------|
| Aa | Texto / Heading |
| 🖼 | Imagem (upload ou IA) |
| ── | Divisor |
| ❝ | Citação/Quote |
| 📊 | Tabela simples |
| 🔲 | Layout 2 colunas |

Cada botão insere o bloco na posição do cursor no editor.

### 3. Thumbnails de páginas no sidebar esquerdo
Substituir a lista de texto dos capítulos por mini-previews visuais (como o Gamma mostra slides numerados). Cada thumbnail mostra uma miniatura renderizada do conteúdo do capítulo com número.

### 4. Drag & Drop de capítulos
Adicionar reordenação por arrastar no sidebar esquerdo usando a biblioteca `@dnd-kit` ou HTML5 drag events.

### 5. Botão "Tema" na barra superior
Adicionar botão "Tema" no header do editor que abre o `EbookThemeSelector` existente num popover. O tema selecionado persiste no eBook (coluna `theme` já existe na DB).

### 6. Modo Apresentação / Fullscreen
Botão "Apresentar" que abre o `FlipbookReader` em modo fullscreen (como o botão "Apresentar" do Gamma).

### 7. Floating toolbar inline
Ao selecionar texto, mostrar toolbar flutuante com: Bold, Italic, Underline, Link, AI (reescrever/melhorar seleção). Reutilizar o `InlineToolbar` já existente no `email-builder/`.

### 8. Menu de ações por bloco
Ao hover sobre um bloco, mostrar ícone `⋮` com menu: Duplicar, Eliminar, Mover ↑↓, Reescrever com IA.

---

## Alterações técnicas

### Ficheiros novos
- `src/components/ebooks/EbookRichEditor.tsx` — editor contentEditable para capítulos
- `src/components/ebooks/EbookBlockToolbar.tsx` — sidebar direita com ferramentas de blocos
- `src/components/ebooks/ChapterThumbnail.tsx` — mini-preview visual de capítulo
- `src/components/ebooks/BlockActionMenu.tsx` — menu contextual por bloco

### Ficheiros editados
- `src/components/ebooks/EbookEditor.tsx` — layout 3 colunas (thumbnails | editor | toolbar), integrar WYSIWYG, tema no header, botão apresentar
- `src/components/ebooks/FlipbookReader.tsx` — adicionar prop para modo fullscreen

### Dependências
- Nenhuma nova — reutilizar `contentEditable` + `document.execCommand` (padrão já usado no email-builder)
- Drag & drop via HTML5 nativo (sem lib extra)

### Migração de dados
- Função utilitária para converter Markdown → HTML (para capítulos existentes), executada on-read no editor

---

## Ordem de implementação

1. Editor WYSIWYG + floating toolbar (core)
2. Sidebar direita com blocos de conteúdo
3. Thumbnails visuais no sidebar esquerdo
4. Drag & drop de capítulos
5. Botão Tema + Apresentar no header
6. Menu de ações por bloco

