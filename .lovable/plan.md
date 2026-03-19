

## Corrigir cabeçalho de email, adicionar assinatura a respostas e melhorar campos do email

### Problemas identificados

1. **Cabeçalho "Desconhecido"**: O `ConversationDetail.tsx` (linha 227) mostra `conversation.lead?.name || "Desconhecido"`, mas para emails sem lead associado, deveria extrair o remetente de `channel_metadata` (campos `from_email`, `from_name`).

2. **Assinatura ausente nas respostas**: O `useMessages.ts` (linha 260) envia `isHtml: false` e o `content` puro sem anexar a assinatura. O `EmailRichComposer.tsx` tambem nao anexa assinatura. Ambos precisam integrar o hook `useEmailSignature`.

3. **Campos de email em falta no EmailMessageBubble**: Nao mostra De/Para/Cc — apenas o assunto. Estes campos existem em `channel_metadata` da conversa mas nao sao passados nem exibidos.

### Alteracoes

**1. ConversationDetail.tsx — Resolver "Desconhecido"**
- Extrair `channel_metadata` da conversa (ja disponivel via select `*`)
- No cabeçalho, usar: `lead?.name || contact?.name || channel_metadata?.from_name || channel_metadata?.from_email || external_thread_id || "Desconhecido"`

**2. useMessages.ts — Anexar assinatura nas respostas por email**
- Nao e possivel usar hooks dentro de `mutationFn`, entao a assinatura sera carregada directamente via query ao `workspace_settings` dentro do bloco de email do `useSendMessage`
- Concatenar `signatureHtml` ao `content` antes de enviar, e definir `isHtml: true` quando houver assinatura

**3. EmailRichComposer.tsx — Anexar assinatura no composer de email**
- Importar `useEmailSignature`
- No `handleSend`, concatenar a assinatura ao `body` antes de enviar
- Mostrar indicador de que a assinatura sera incluida

**4. EmailMessageBubble.tsx — Mostrar campos De/Para**
- Adicionar props `fromEmail`, `toEmail`, `cc` ao componente
- Exibir estes campos no cabeçalho da bolha de email (abaixo do assunto)
- No `ConversationDetail.tsx`, passar `channel_metadata` ao `EmailMessageBubble`

### Ficheiros a alterar
- `src/components/inbox/ConversationDetail.tsx`
- `src/components/inbox/EmailMessageBubble.tsx`
- `src/components/inbox/EmailRichComposer.tsx`
- `src/hooks/useMessages.ts`

