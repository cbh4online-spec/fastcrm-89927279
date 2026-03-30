

# Integrar Tiptap no MessageInput do Inbox

## Resumo
Substituir o `<textarea>` por um editor Tiptap inline, mantendo o layout circular existente e adicionando uma toolbar de formatação compacta.

## Alterações

### 1. Criar `src/components/inbox/RichTextEditor.tsx`
Componente wrapper do Tiptap com:
- Extensions: StarterKit, Placeholder, Link
- Bubble menu (toolbar flutuante ao seleccionar texto) com botões: Bold, Italic, Strikethrough, Link
- Estilo inline compatível com o container rounded existente
- Prop `onUpdate` para devolver HTML, `onEnterSend` para trigger de envio
- Prop `placeholder`, `disabled`, `editable`
- Método imperativo `clearContent()` via ref

### 2. Modificar `src/components/inbox/MessageInput.tsx`
- Substituir `<textarea>` pelo novo `RichTextEditor`
- `onSend` passa a enviar HTML (`editor.getHTML()`) em vez de plain text
- Manter todos os botões existentes (Plus, Smile, Mic, Paperclip, Send)
- Enter sem Shift continua a enviar; Shift+Enter nova linha
- Verificação de conteúdo vazio: usar `editor.isEmpty` em vez de `message.trim()`
- Manter a prop interface compatível (`onSend: (message: string) => Promise<void>` — agora envia HTML string)

### 3. Adicionar toolbar compacta acima do input (opcional toggle)
- Linha de botões pequenos: **B**, *I*, ~~S~~, Link, Lista
- Visível apenas quando o editor tem foco ou tem conteúdo formatado
- Posicionada dentro do container, acima da área de texto

## Estrutura visual

```text
┌─────────────────────────────────────────────┐
│ [B] [I] [S] [Link] [UL] [OL]    ← toolbar  │
├─────────────────────────────────────────────┤
│ [+]  Editor Tiptap inline...   [😊][🎤][📎][➤] │
└─────────────────────────────────────────────┘
```

## Critérios de aceitação
- Editor suporta bold, italic, strikethrough, links e listas
- Enter envia, Shift+Enter quebra linha
- Mensagem enviada como HTML string
- Input limpa após envio
- Placeholder visível quando vazio
- Sem regressões nos botões existentes

