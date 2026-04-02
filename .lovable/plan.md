

## Corrigir templates que não abrem no ComposeEmailDialog

### Diagnóstico

O `InboxTemplatePanel` usa um componente `Sheet` (baseado em `@radix-ui/react-dialog`). O `ComposeEmailDialog` também usa `Dialog` (mesma primitiva Radix). Quando um `SheetTrigger` está aninhado dentro de um `Dialog` modal, o Radix intercepta o clique no trigger e trata-o como interacção do Dialog pai — o Sheet nunca abre.

Isto confirma-se pelo session replay: o utilizador clica várias vezes no botão "Templates" sem efeito.

### Solução

Remover a dependência do `SheetTrigger` dentro do contexto do `ComposeEmailDialog` e controlar o `Sheet` programaticamente:

**Ficheiro: `src/components/inbox/InboxTemplatePanel.tsx`**
- Aceitar uma nova prop `externalOpen` + `onExternalOpenChange` para controlo externo do estado `open`
- Quando `externalOpen` é fornecido, usar esse estado em vez do interno
- Manter o `SheetTrigger` funcional para os contextos onde não há Dialog pai (Inbox)

**Ficheiro: `src/components/email/ComposeEmailDialog.tsx`**
- Em vez de passar o botão como `trigger` ao `InboxTemplatePanel`, gerir o estado `open` localmente
- O botão Templates chama `setTemplatesOpen(true)` directamente (evento onClick, sem SheetTrigger)
- Passar `externalOpen={templatesOpen}` e `onExternalOpenChange={setTemplatesOpen}` ao painel

### Alterações

1. **`InboxTemplatePanel.tsx`**: Adicionar props `externalOpen` / `onExternalOpenChange`. Quando fornecidas, usar essas em vez do estado interno. Renderizar `Sheet` sem `SheetTrigger` nesse modo.

2. **`ComposeEmailDialog.tsx`**: Criar estado `templatesOpen`. O botão Templates usa `onClick` directo. Passar props de controlo externo ao `InboxTemplatePanel`.

3. **`EmailRichComposer.tsx`**: Verificar se tem o mesmo problema (também está dentro de contextos de composição) e aplicar a mesma correcção se necessário.

### Critérios de aceitação
- Clicar em "Templates" no ComposeEmailDialog abre o painel lateral
- Templates continuam a funcionar normalmente no Inbox (AIMessageComposer / EmailRichComposer)
- Seleccionar e inserir template aplica conteúdo ao editor

