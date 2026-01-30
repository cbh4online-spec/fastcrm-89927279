

# Plano: Email Builder Visual Profissional - Experiencia de Nivel Enterprise

## Analise Comparativa

Depois de analisar os screenshots do E-goi e GoHighLevel, identifiquei as seguintes lacunas criticas:

### O que falta (vs exemplos profissionais):

| Funcionalidade | Estado Atual | E-goi/GoHighLevel |
|----------------|--------------|-------------------|
| Editar texto inline | Textarea com HTML | Editor WYSIWYG direto no canvas |
| Upload de imagens | URL manual | Drag-drop com upload integrado |
| Selecao visual de elementos | Clica > sidebar | Clica diretamente e edita inline |
| Toolbar flutuante | Basica | Rica com bold, italic, cores, links |
| Preview em tempo real | Modal separado | Lado a lado com toggle |
| Galeria de templates | 4 layouts basicos | Galeria visual com thumbnails |
| Quick actions | Botoes simples | Contextual com hover inteligente |
| Variaveis dinamicas | Escrever manual | Picker visual integrado |
| Arrastar elementos | Funciona | Feedback visual mais rico |
| Bloco Hero | Nao existe | Imagem grande + titulo + CTA |
| Bloco Countdown | Nao existe | Timer animado |
| Bloco Testimonial | Nao existe | Citacao + avatar |
| Bloco Product Card | Nao existe | Imagem + preco + botao |

---

## Arquitetura da Solucao

```text
+--------------------------------------------------+
|                   HEADER BAR                      |
| [X] [Titulo] [Undo][Redo] [Desktop][Mobile] [Save]|
+--------+-----------------------------+------------+
|        |                             |            |
| LEFT   |         CANVAS              |   RIGHT    |
| PANEL  |    (Preview Live)           |   PANEL    |
|        |                             |            |
| Tabs:  |   +-------------------+     | Properties |
| - Add  |   |     HEADER        |     |            |
| - Rows |   |   [Edit Inline]   |     | - Content  |
| - Setup|   +-------------------+     | - Style    |
|        |   |                   |     | - Advanced |
| Cards  |   |   BODY CONTENT    |     |            |
| visuais|   |   [Rich Editor]   |     | Actions:   |
|        |   |                   |     | - Duplicate|
|        |   +-------------------+     | - Delete   |
|        |   |     FOOTER        |     | - Move     |
|        |   +-------------------+     |            |
+--------+-----------------------------+------------+
|               VARIABLE PICKER BAR                 |
+--------------------------------------------------+
```

---

## Fase 1: Novos Tipos de Blocos Visuais

### Blocos Premium a Adicionar

1. **Hero Block**
   - Imagem de fundo full-width
   - Titulo overlay
   - Subtitulo
   - CTA button

2. **Product Card**
   - Imagem do produto
   - Nome e descricao
   - Preco (com strike para desconto)
   - Botao comprar

3. **Testimonial**
   - Citacao
   - Avatar
   - Nome e cargo

4. **Countdown Timer**
   - Data/hora alvo
   - Estilo visual (dias, horas, mins, segs)
   - Mensagem de urgencia

5. **Image + Text Row**
   - Lado a lado (50/50, 60/40, etc)
   - Imagem esquerda ou direita
   - Texto rico

6. **Menu/Navigation**
   - Links horizontais
   - Separadores

7. **Video Thumbnail**
   - Imagem com botao play
   - Link para video

---

## Fase 2: Editor Inline WYSIWYG

### Componente RichTextEditor

Em vez de editar HTML numa textarea, implementar edicao direta no canvas:

```text
Clicar num bloco de texto:
  -> Ativa modo edicao inline
  -> Toolbar flutuante aparece:
     [B] [I] [U] [S] | [Color] [Link] | [H1] [H2] [P] | [{{}}]
  -> Clicar fora = guardar automaticamente
```

### Tecnologia

Usar `contentEditable` nativo do React com handlers customizados para:
- Negrito (Ctrl+B)
- Italico (Ctrl+I)
- Links
- Cores de texto
- Inserir variaveis

---

## Fase 3: Upload de Imagens Integrado

### Fluxo de Upload

1. Clicar no bloco imagem vazio
2. Modal abre com opcoes:
   - Upload do computador (drag-drop)
   - Colar URL
   - Galeria de imagens anteriores
   - Stock photos (unsplash integration)
3. Preview antes de confirmar
4. Cropping basico

### Armazenamento

Usar Supabase Storage bucket `email-images` para guardar uploads.

---

## Fase 4: Sidebar Esquerda Redesenhada

### Estrutura em Tabs

**Tab: Adicionar**
- Cards visuais grandes com preview de cada elemento
- Organizados por categoria com icones coloridos
- Drag-and-drop com ghost preview

**Tab: Linhas (Rows)**
- Pre-sets de estruturas:
  - 1 coluna (100%)
  - 2 colunas (50-50, 60-40, 70-30)
  - 3 colunas
  - 4 colunas

**Tab: Design**
- Cores globais com swatches
- Tipografia com preview
- Espacamento
- Bordas

---

## Fase 5: Painel Direito Contextual

### Redesign do BlockEditor

Quando um bloco esta selecionado:

```text
+------------------------+
|  [Icone] Tipo Bloco    |
|  [X fechar]            |
+------------------------+
| TABS: Content | Style  |
+------------------------+

Content Tab:
- Campos especificos do tipo
- Preview live inline
- Botao inserir variavel

Style Tab:
- Padding visual (4 inputs)
- Margem
- Background (color picker)
- Bordas (width, color, radius)
- Sombra (toggle + config)

+------------------------+
| [Duplicar] [Eliminar]  |
+------------------------+
```

### Animacoes

- Slide-in suave quando bloco selecionado
- Transicoes entre tabs
- Highlight do bloco no canvas

---

## Fase 6: Galeria de Templates Premium

### Categorias de Templates

1. **E-commerce**
   - Lancamento de produto
   - Carrinho abandonado
   - Confirmacao de compra

2. **Newsletter**
   - Blog digest
   - Noticias semanais
   - Curadoria

3. **Promocional**
   - Black Friday
   - Desconto flash
   - Membro VIP

4. **Transacional**
   - Boas-vindas
   - Reset password
   - Confirmacao

5. **Eventos**
   - Webinar
   - Convite
   - Lembrete

### UI da Galeria

- Grid visual com thumbnails reais
- Filtro por categoria
- Pesquisa por nome
- Preview em hover
- Favoritos

---

## Fase 7: Quick Actions e UX Polish

### Toolbar Flutuante no Canvas

Quando hover sobre um bloco:

```text
      +------------------------+
      | [Tipo] | ^ v | [+] [x] |
      +------------------------+
```

- Arrastar com grip
- Mover cima/baixo
- Adicionar bloco depois
- Eliminar

### Zonas de Drop Visuais

- Linha azul animada entre blocos
- Indicador de posicao quando arrasta
- Snap-to-grid suave

### Atalhos de Teclado

- `Delete` - Eliminar bloco
- `Ctrl+D` - Duplicar bloco
- `Ctrl+Z/Y` - Undo/Redo
- `Ctrl+S` - Guardar
- `Arrow Up/Down` - Navegar blocos

---

## Fase 8: Variable Picker Integrado

### Componente VariablePicker

Barra inferior ou popup com:

```text
+--------------------------------------------+
| Variaveis: [{{primeiro_nome}}] [{{email}}] |
|            [{{empresa}}] [{{unsub}}] [+]   |
+--------------------------------------------+
```

- Click para inserir na posicao do cursor
- Drag para posicao especifica
- Tooltip com preview

---

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/email-builder/RichTextEditor.tsx` | Editor WYSIWYG inline |
| `src/components/email-builder/InlineToolbar.tsx` | Toolbar flutuante de formatacao |
| `src/components/email-builder/ImageUploader.tsx` | Modal de upload de imagens |
| `src/components/email-builder/VariablePicker.tsx` | Picker de variaveis |
| `src/components/email-builder/TemplateGallery.tsx` | Galeria visual de templates |
| `src/components/email-builder/blocks/HeroBlock.tsx` | Bloco hero premium |
| `src/components/email-builder/blocks/ProductCard.tsx` | Bloco cartao de produto |
| `src/components/email-builder/blocks/Testimonial.tsx` | Bloco testemunho |
| `src/components/email-builder/blocks/ImageTextRow.tsx` | Bloco imagem + texto |
| `src/components/email-builder/blocks/CountdownBlock.tsx` | Bloco countdown |
| `src/components/email-builder/RowLayouts.tsx` | Selector de estruturas |
| `src/components/email-builder/QuickActionsBar.tsx` | Barra de acoes rapidas |
| `src/components/email-builder/KeyboardShortcuts.tsx` | Hook para atalhos |
| `src/components/email-builder/DragGhostPreview.tsx` | Preview ao arrastar |

---

## Ficheiros a Modificar Significativamente

| Ficheiro | Alteracao |
|----------|-----------|
| `EmailBuilder.tsx` | Nova estrutura de layout, undo/redo, atalhos |
| `EmailCanvas.tsx` | Edicao inline, drop zones animadas, zoom |
| `ElementsSidebar.tsx` | Cards visuais, categorias coloridas |
| `BlockEditor.tsx` | Tabs, padding visual, sombras |
| `DesignSidebar.tsx` | Swatches, tipografia melhorada |
| `emailBuilder.ts` (types) | Novos tipos de blocos |
| `emailRenderer.ts` | Renderizar novos blocos |

---

## Dependencias Necessarias

Nenhuma nova - usar:
- `contentEditable` nativo
- Supabase Storage para imagens
- CSS animations existentes

---

## Preview do Resultado Final

Apos implementacao, o editor tera:

1. **Visual profissional** - Aspeto de ferramenta enterprise
2. **Edicao inline** - Clicar e escrever diretamente
3. **Drag-and-drop fluido** - Com feedback visual rico
4. **Templates prontos** - 15+ templates para usar
5. **Upload de imagens** - Simples e integrado
6. **Variaveis faceis** - Um click para inserir
7. **Preview instantaneo** - Desktop/mobile lado a lado
8. **Undo/Redo** - Historico de alteracoes
9. **Atalhos** - Para utilizadores avancados
10. **Responsive** - Funciona em tablet/mobile

---

## Prioridade de Implementacao

### Sprint 1 (Essencial)
- RichTextEditor inline
- InlineToolbar
- ImageUploader com Supabase Storage
- 3 novos blocos (Hero, ImageText, Product)

### Sprint 2 (Completo)
- VariablePicker
- TemplateGallery com 15 templates
- Undo/Redo
- Atalhos de teclado

### Sprint 3 (Polish)
- Animacoes e transicoes
- Countdown block
- Testimonial block
- Preview side-by-side

---

## Metricas de Sucesso

- Utilizador cria email em < 5 minutos
- Zero necessidade de escrever HTML
- NPS > 8 na experiencia de edicao
- Taxa de conclusao de campanhas > 80%

