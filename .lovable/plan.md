

# Redesign do Editor de eBooks — Diagnóstico e Plano de Melhoria

## 1. Diagnóstico UX/UI

### Problemas Críticos Identificados

**A. Header sobrecarregado (linha 405-493)**
- 12+ botões aglomerados numa única barra horizontal de 40px de altura
- Mix de acções primárias (Publicar), secundárias (Tema, Apresentar) e terciárias (Upload capa) no mesmo nível
- Badge de status, thumbnail, título, métricas e botões todos na mesma linha — sem hierarquia
- Em viewports < 1400px, os botões fazem overflow

**B. Toolbar do capítulo duplicada**
- O `BlockActionMenu` (duplicar, apagar, mover) aparece na toolbar do capítulo E nos thumbnails — redundância
- Undo/Redo aparece na toolbar do capítulo E na sidebar direita — duplicado

**C. Sidebar direita demasiado densa**
- 4 secções verticais (Blocos, Tipografia, Cabeçalho/Rodapé, Contactos) numa coluna de 224px
- Mistura ferramentas de edição (blocos) com configurações globais (tipografia, branding)
- Scroll infinito na sidebar — utilizador perde contexto

**D. Área central sem preview inline**
- O editor é um `contentEditable` puro sem qualquer preview de como ficará no flipbook
- Utilizador precisa clicar "Apresentar" para ver o resultado — ciclo feedback lento
- Sem indicação de quebras de página

**E. Estado vazio fraco**
- Quando nenhum capítulo está seleccionado: ícone genérico + "Selecione um capítulo"
- Sem acções directas (criar primeiro capítulo, importar conteúdo)

**F. Sidebar esquerda (thumbnails)**
- Thumbnails são cards 4:3 com texto a 9-10px — ilegíveis
- Sem numeração visual clara nem separação entre capítulos com/sem conteúdo
- O botão "+" no footer confunde-se com o "+" no header

---

## 2. Proposta de Melhoria — Estrutura por Zonas

```text
┌─────────────────────────────────────────────────────┐
│ HEADER (compact 48px)                               │
│ [←] Título editável   Status    [Tema] [Preview] [Pub]│
├────────┬─────────────────────────────┬──────────────┤
│ SIDEBAR│   CENTRO (Editor)           │  PAINEL DIR  │
│ ESQUERDA│                             │  (Tabs)      │
│ 180px  │  Toolbar do capítulo        │              │
│        │  ────────────────           │ [Blocos]     │
│ Thumb 1│  Editor WYSIWYG            │ [Estilo]     │
│ Thumb 2│                             │ [Branding]   │
│ Thumb 3│                             │              │
│ [+ Add]│                             │              │
├────────┴─────────────────────────────┴──────────────┤
│ FOOTER BAR (info) — X capítulos · Y palavras · Z%  │
└─────────────────────────────────────────────────────┘
```

### Zona 1: Header Simplificado
- **Eliminar** thumbnail da capa do header (irrelevante a 32x40px)
- **Agrupar** acções secundárias (Tema, Capa IA, Upload Capa) num `DropdownMenu` "Definições"
- **Mover** métricas (capítulos, palavras, %) para uma barra de estado no fundo
- Manter apenas: `← Voltar | Título editável | Status badge | Preview | Publicar`

### Zona 2: Sidebar Esquerda — Thumbnails Melhorados
- Aumentar largura de 176px para 200px
- Thumbnails com número grande visível (1, 2, 3...) em overlay
- Indicador visual mais claro: borda verde = conteúdo, borda amber = vazio
- Remover label repetido abaixo do thumbnail (já está dentro)
- Manter drag & drop e menu "..."

### Zona 3: Centro — Editor Melhorado
- **Mover** undo/redo e acções IA para a toolbar do capítulo (já lá estão)
- Remover undo/redo duplicados da sidebar direita
- Adicionar indicador visual de "quebra de página estimada" — uma linha tracejada a cada ~800 caracteres
- Melhorar placeholder do estado vazio com CTAs directos

### Zona 4: Sidebar Direita — Sistema de Tabs
- **Reorganizar** em 3 tabs: `Blocos | Estilo | Branding`
  - **Blocos**: toolbar de inserção (texto, média, layout) — sem undo/redo
  - **Estilo**: Tema + Tipografia (títulos e corpo) + cores
  - **Branding**: Cabeçalho, Rodapé, Página de Contactos
- Remover a secção undo/redo da sidebar (já existe na toolbar do capítulo)
- Cada tab tem scroll independente

### Zona 5: Barra de Estado (nova)
- Fina barra no fundo: `7 capítulos · 6964 palavras · 88% concluído · Guardado ✓`
- Substituir as métricas espalhadas pelo header

---

## 3. Microcopy Sugerida

| Elemento | Actual | Proposto |
|---|---|---|
| Header vazio | "Selecione um capítulo" | "Selecione um capítulo para editar ou crie um novo" |
| Sub-texto vazio | "ou adicione um novo na barra lateral" | Botão: "Criar primeiro capítulo" |
| Botão Tema | "Tema" | "Aparência" (dentro do dropdown Definições) |
| Botão Publicar | "Publicar" | Manter |
| Tabs sidebar | n/a | "Inserir" · "Estilo" · "Marca" |
| Barra estado | n/a | "7 capítulos · 6.964 palavras · Guardado" |
| Placeholder editor | "Comece a escrever..." | "Escreva o conteúdo deste capítulo. Use a barra lateral para inserir blocos." |

---

## 4. Plano de Implementação

### Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `EbookEditor.tsx` | Refactor header (simplificar), adicionar tabs na sidebar direita, criar barra de estado, melhorar estado vazio, mover métricas |
| `EbookBlockToolbar.tsx` | Remover secção undo/redo, tornar componente mais compacto |
| `ChapterThumbnail.tsx` | Adicionar número overlay grande, melhorar indicadores visuais |

### Detalhe Técnico

**1. Header simplificado** — Substituir os 12 botões por:
- `← | Título | Badge | [Definições ▾] | [Preview] | [Publicar]`
- O dropdown "Definições" contém: Aparência/Tema, Capa IA, Upload Capa, Ver publicação

**2. Sidebar direita com Tabs** — Usar `Tabs` do shadcn com 3 panels:
- Tab "Inserir": componente `EbookBlockToolbar` (sem undo/redo)
- Tab "Estilo": `EbookThemeSelector` + selectors de fonte (já existentes linhas 690-736)
- Tab "Marca": inputs de cabeçalho/rodapé + contactos (já existentes linhas 739-800)

**3. Barra de estado** — Nova `div` fixa no fundo do editor:
- Mostra: nº capítulos, nº palavras, % progresso, indicador "Guardado"
- Substitui as métricas que estão no header (linha 438-442)

**4. Thumbnails melhorados** — Overlay com número grande (font-size: 20px, semi-transparent) no canto inferior-esquerdo, remover label redundante abaixo do card

**5. Estado vazio melhorado** — Adicionar botão "Criar primeiro capítulo" no centro quando não há capítulos, e "Selecione ou crie um capítulo" quando há capítulos mas nenhum seleccionado

---

## 5. Critérios de Aceitação

- Header tem no máximo 5 elementos visíveis (sem overflow em 1280px)
- Sidebar direita organizada em 3 tabs navegáveis
- Métricas aparecem na barra de estado e NÃO no header
- Undo/Redo aparece em apenas um local (toolbar do capítulo)
- Estado vazio tem CTA funcional
- Thumbnails mostram número do capítulo legível
- Nenhuma funcionalidade existente foi removida (apenas reorganizada)
- Dark mode mantém contraste adequado

---

## 6. Riscos

- A reorganização das tabs na sidebar pode confundir utilizadores existentes — mitigação: os mesmos conteúdos estão presentes, apenas agrupados de forma diferente
- A remoção do undo/redo duplicado não impacta funcionalidade (mantém-se na toolbar + Ctrl+Z)

