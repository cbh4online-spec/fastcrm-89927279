

# Tornar o eBook Visualmente Rico — Imagens e Design Gráfico

## Problema actual
O eBook é apenas texto Markdown puro — sem capa visual, sem imagens nos capítulos, sem elementos gráficos. Não parece um eBook real, parece um documento de texto.

## O que vai mudar

### 1. Capa do eBook (Cover)
- Upload de imagem de capa no editor (ou gerar via IA)
- Exibir a capa na lista de eBooks como card visual grande
- Na página pública, mostrar capa full-width como hero antes do conteúdo

### 2. Imagem de capa por capítulo
- Cada capítulo passa a ter campo `cover_image` opcional
- Botão no editor para fazer upload ou gerar imagem IA para o capítulo
- Imagem exibida no topo do capítulo tanto no editor (preview) como no leitor público

### 3. Preview do editor estilizado como eBook real
- Preview com fundo branco, margens de "página", sombra de livro
- Tipografia serif para o corpo do texto (font-serif)
- Cabeçalhos decorados com número do capítulo e linha decorativa
- Imagem do capítulo renderizada no topo com overlay de título
- Blockquotes, listas e code blocks com estilo editorial

### 4. Leitor público redesenhado como livro digital
- Cover page como primeira "página" com imagem, título e autor
- Cada capítulo com imagem hero no topo
- Tipografia de livro: serif, line-height generoso, max-width 680px
- Separadores visuais entre secções (ornamentos tipográficos)
- Drop caps (letra inicial grande) no primeiro parágrafo de cada capítulo
- Cabeçalhos com decoração (barra lateral, numeração estilizada)

### 5. Suporte a imagens inline no conteúdo Markdown
- O ReactMarkdown já suporta `![alt](url)` — garantir que as imagens renderizam com estilo
- Imagens centradas, com cantos arredondados, sombra subtil, caption abaixo

## Detalhes técnicos
- O campo `cover_url` já existe na tabela `ebooks` — usar para a capa do eBook
- Adicionar `cover_image?: string` ao tipo `EbookChapter` (JSONB, não requer migração)
- Upload de imagens para Supabase Storage bucket `ebook-assets` (criar se não existir)
- Geração de imagens via Lovable AI (google/gemini-2.5-flash-image) — botão "Gerar capa IA"
- Ficheiros alterados: `EbookEditor.tsx`, `PublicEbookPage.tsx`, `EbooksList.tsx`, `useEbooks.ts`
- Novo bucket storage: `ebook-assets` (público para leitura)

