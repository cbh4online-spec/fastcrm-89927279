

# Componente RichTextEditor reutilizável com Tiptap

## Diagnóstico

Existem actualmente duas implementações separadas:
1. **Inbox** (`src/components/inbox/RichTextEditor.tsx`) — Tiptap, compacto, orientado a chat (Enter envia)
2. **Email Builder** (`src/components/email-builder/RichTextEditor.tsx`) — `contentEditable` + `document.execCommand` (legacy, depreciado pelos browsers)

O Email Builder usa ainda `InlineToolbar.tsx` baseado em `execCommand`. As Notas (`OpportunityNotesTab`) usam um `<Textarea>` simples.

## Plano

### 1. Criar `src/components/ui/RichTextEditor.tsx` — componente partilhado

Componente Tiptap configurável com props para controlar funcionalidades:

- **Extensions**: StarterKit, Placeholder, Link, Image (opcional via prop `enableImage`)
- **Toolbar fixa** no topo (não bubble menu) com: Bold, Italic, Strikethrough, Link, Lista, Lista numerada, Imagem (condicional)
- **Props**:
  - `value` / `onChange(html)` — controlled mode
  - `placeholder`, `disabled`, `className`
  - `minHeight` (default 100px para notas, 130px para email)
  - `enableImage?: boolean` — mostra botão de imagem na toolbar
  - `onImageUpload?: () => void` — callback externo para upload
  - `onInsertVariable?: (variable: string) => void` — para o Email Builder
  - `showVariables?: boolean` — mostra botão de variáveis na toolbar
- **Ref imperativo**: `clearContent()`, `isEmpty()`, `getHTML()`, `focus()`, `insertContent(html)`

### 2. Migrar Email Builder para o novo componente

- `BlockEditor.tsx` (linha 90): substituir `<RichTextEditor>` do email-builder pelo novo de `@/components/ui/RichTextEditor`
- Passar `enableImage`, `showVariables` e `onInsertVariable` para manter funcionalidade actual
- O `InlineToolbar.tsx` e o antigo `RichTextEditor` do email-builder podem ser removidos ou mantidos temporariamente (a toolbar de `execCommand` é substituída pela toolbar Tiptap)

### 3. Migrar OpportunityNotesTab para rich-text

- Substituir `<Textarea>` pelo novo `RichTextEditor`
- Notas passam a guardar HTML em vez de plain text
- A renderização das notas existentes usa `dangerouslySetInnerHTML` (com sanitização) em vez de `whitespace-pre-wrap`
- Notas antigas (plain text) continuam a funcionar — se não contiver tags HTML, renderizar como texto

### 4. Manter Inbox RichTextEditor separado

O editor do Inbox tem comportamento específico (Enter envia, layout inline compacto) — não faz sentido unificar. Mantém-se como está.

## Ficheiros alterados

| Ficheiro | Acção |
|---|---|
| `src/components/ui/RichTextEditor.tsx` | Criar (novo) |
| `src/components/email-builder/BlockEditor.tsx` | Actualizar import |
| `src/components/email-builder/index.ts` | Remover export do RichTextEditor antigo |
| `src/components/opportunities/detail/OpportunityNotesTab.tsx` | Substituir Textarea por RichTextEditor |

## Critérios de aceitação
- Toolbar com bold, italic, strikethrough, link, listas e imagem (condicional)
- Email Builder funciona com o novo editor (variáveis e imagens)
- Notas suportam formatação rich-text
- Notas antigas plain-text renderizam correctamente
- Build sem erros

