

# Tornar o compositor de email verdadeiramente dinâmico e profissional

## Diagnóstico
O compositor actual é um dialog básico com um `<textarea>` simples, toolbar apertada e layout pouco profissional. O projecto já tem componentes ricos (`RichTextEditor` com contentEditable, `InlineToolbar` com formatação completa, `AIEmailAssistPanel`, templates, anexos, pagamentos, reuniões, traduções) mas o compositor não os utiliza adequadamente. O campo "Para" é estático (badge fixa) sem possibilidade de pesquisar contactos.

## Plano de implementação

### 1. Substituir textarea por RichTextEditor
- Substituir o `<textarea>` pelo `RichTextEditor` existente em `src/components/email-builder/RichTextEditor.tsx` que já suporta:
  - Formatação inline (bold, italic, underline, strikethrough)
  - Headings, alinhamento, listas
  - Inserção de variáveis dinâmicas
  - Cores de texto
  - Links
  - Atalhos de teclado (Ctrl+B/I/U)
- Envolver o compositor com `EmailEditorProvider` para o contexto funcionar
- Remover os botões de formatação manuais da toolbar (já existem no InlineToolbar ao seleccionar texto)

### 2. Campo "Para" com pesquisa de contactos
- Substituir o badge estático por um input com autocomplete usando `useEntitySearch` (hook já existente com `searchContacts`)
- Permitir pesquisar contactos, leads e empresas por nome/email
- Mostrar resultados em dropdown com avatar, nome e email
- Permitir adicionar múltiplos destinatários (não apenas um)

### 3. Redesenhar layout do compositor
- Expandir dialog para `max-w-3xl` com layout mais espaçoso
- Header profissional com remetente e título "Novo Email"
- Toolbar reorganizada em grupos lógicos com separadores:
  - **Grupo 1**: Templates, AI Assist
  - **Grupo 2**: Anexos, Link pagamento, Reunião
  - **Grupo 3**: Traduzir, Agendar
- Barra de status inferior com indicadores (HTML, anexos, assinatura, prioridade)
- Área de escrita mais ampla (min-height: 300px)

### 4. Novas funcionalidades
- **Selector de prioridade** (Normal, Alta, Urgente) com badge visual
- **Confirmação de leitura** (toggle para solicitar read receipt)
- **Rascunho automático** — guardar estado enquanto o dialog está aberto
- **Undo/Redo** no editor rico (já suportado nativamente pelo contentEditable)
- **Drag & drop de ficheiros** na área de edição para anexar

### 5. Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/components/email/ComposeEmailDialog.tsx` | Redesenho completo: RichTextEditor, pesquisa de contactos, layout profissional, prioridade, read receipt, drag & drop |

### Resultado esperado
- Editor rico com toolbar flutuante ao seleccionar texto (bold, italic, headings, cores, links, variáveis)
- Campo "Para" pesquisável com autocomplete de contactos/leads/empresas
- Layout mais espaçoso e profissional
- Toolbar organizada com todas as funcionalidades existentes bem agrupadas
- Novas opções: prioridade, confirmação de leitura, drag & drop de anexos

