

# Redesign Premium dos eBooks — 3 Páginas

## 1. EbooksList — Lista de eBooks

**Header premium**
- Gradiente subtil de fundo, ícone BookOpen com container gradient (azul/purple), badge "Biblioteca" 
- Contador de eBooks e palavras totais como KPIs inline

**Cards dos eBooks redesenhados**
- Cover placeholder com gradiente (ou imagem real se existir `cover_url`)
- Overlay com título e subtítulo sobre o gradient
- Barra de progresso visual (capítulos com conteúdo vs vazios)
- Badge de status com cores distintas (verde publicado, âmbar rascunho)
- Hover com `framer-motion` scale + shadow elevation
- Footer com autor, contagem de capítulos e palavras

**Estado vazio premium**
- Ilustração maior com gradiente, texto motivacional, dois CTAs (Manual + IA)

**Dialog de criação melhorado**
- Tabs visuais em vez de botões toggle para Manual/IA
- Ícones com backgrounds coloridos para cada modo

---

## 2. EbookEditor — Editor de Capítulos

**Header executivo**
- Breadcrumb: eBooks > Título do eBook
- Stats bar: capítulos, palavras totais, progresso de escrita (barra visual)
- Botões com gradientes (Publicar = gradient primário, Ver = outline premium)

**Sidebar de capítulos melhorada**
- Card com header gradient subtil
- Cada capítulo com indicador visual de estado (check verde = tem conteúdo, ponto âmbar = vazio)
- Drag handle estilizado com hover
- Botão adicionar com estilo dashed border + ícone

**Área de edição**
- Toolbar flutuante com botões IA estilizados (gradient sparkles)
- Separação visual entre edit/preview com tabs animadas
- Preview com tipografia melhorada e espaçamento de livro real
- Placeholder com ilustração e dicas visuais

**Animações**
- `framer-motion` nos cards da sidebar e transição edit/preview

---

## 3. PublicEbookPage — Leitor Público

**Header sticky premium**
- Gradiente subtil, logo/branding, barra de progresso de leitura (scroll-based)
- Título com tipografia serif/display

**Sidebar de índice**
- Indicador visual do capítulo actual (barra lateral colorida)
- Ícone de check para capítulos já lidos (estado local)
- Hover suave com background gradient

**Área de conteúdo**
- Tipografia de livro (maior, melhor line-height, max-width optimizado para leitura)
- Headings com decoração visual (barra lateral colorida)
- Blockquotes e code blocks estilizados premium

**Navegação entre capítulos**
- Cards de "próximo capítulo" com preview do título e descrição
- Animação de transição ao mudar de capítulo

**Footer do capítulo**
- Autor, data de publicação, partilha social

---

## Detalhes técnicos
- Usar `framer-motion` (já no projecto) para animações staggered
- Manter toda a lógica existente — apenas redesenhar a camada visual
- Seguir a paleta premium do dashboard (gradientes `from-primary/10`, borders `border-primary/20`)
- 3 ficheiros alterados: `EbooksList.tsx`, `EbookEditor.tsx`, `PublicEbookPage.tsx`

