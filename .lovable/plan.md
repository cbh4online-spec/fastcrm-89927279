

## Corrigir Mensagens GHL que Nao Aparecem Corretamente

### Problemas Encontrados

Apos investigar os logs, a base de dados e o codigo, encontrei **dois problemas distintos** que explicam porque as mensagens sincronizadas nao aparecem ou funcionam corretamente:

---

### Problema 1: Canal errado ("other")

Todas as 4 conversas sincronizadas do GHL estao com `channel: "other"` na base de dados, em vez de `instagram`, `whatsapp`, etc.

**Causa**: A API de pesquisa de conversas do GHL (`/conversations/search`) nao retorna o campo `type` (codigo numerico) no resultado. O campo `lastMessageType` tambem pode vir vazio ou num formato diferente. Como resultado, `resolveChannel()` retorna `"other"` para todas.

**Solucao**: 
- Adicionar log dos campos reais recebidos da API GHL para debug
- Usar o `type` das mensagens individuais (que a API de mensagens devolve) para inferir o canal correto
- Apos buscar mensagens, verificar o campo `type` da primeira mensagem e atualizar o canal da conversa se for "other"

---

### Problema 2: Respostas nao funcionam para conversas GHL

No `useSendMessage`, a logica que decide se deve enviar via GHL verifica:
- `channelMeta?.source === "ghl"` -- mas o sync guarda `"ghl_sync"`
- `channel` tem de ser `"sms"`, `"whatsapp"`, `"instagram"`, etc. -- mas o canal e `"other"`

Isto faz com que respostas nao sejam encaminhadas pelo GHL, tornando impossivel responder.

**Solucao**: Adicionar `"ghl_sync"` como valor valido no check de `useSendMessage` e tambem aceitar canal `"other"` quando ha metadata GHL.

---

### Detalhes Tecnicos

**Ficheiro 1**: `supabase/functions/ghl-sync-conversations/index.ts`

Alteracoes:
- Adicionar log dos campos `type` e `lastMessageType` de cada conversa GHL para diagnostico
- Apos fazer fetch das mensagens, verificar o `type` da primeira mensagem e usar `resolveChannel()` com esse valor para corrigir o canal da conversa
- Se o canal mudou de "other" para um canal especifico, atualizar a conversa na base de dados

Codigo conceptual:
```text
// Apos processar mensagens, inferir canal a partir do type da primeira mensagem
if (channel === "other" && messages.length > 0) {
  const firstMsgType = messages[0].type;
  const inferredChannel = resolveChannel(firstMsgType);
  if (inferredChannel !== "other") {
    // Atualizar conversa com canal correto
    await supabase.from("conversations")
      .update({ channel: inferredChannel })
      .eq("id", conversationId);
  }
}
```

**Ficheiro 2**: `src/hooks/useMessages.ts` (funcao `useSendMessage`)

Alteracoes na condicao de routing GHL (linha 135-142):
- Mudar `channelMeta?.source === "ghl"` para `channelMeta?.source === "ghl" || channelMeta?.source === "ghl_sync"`
- Adicionar `"other"` a lista de canais aceites quando ha metadata GHL (para cobrir conversas cujo canal ainda nao foi corrigido)

**Ficheiro 3**: Corrigir conversas existentes na base de dados

Executar uma migracao SQL para corrigir as 4 conversas existentes que ja tem canal "other" mas sao GHL:
```sql
-- Nao e necessario, serao corrigidas na proxima sincronizacao
```

As conversas serao corrigidas automaticamente na proxima sincronizacao, pois o novo codigo vai inferir o canal das mensagens ja guardadas.

### Resultado Esperado

- Conversas sincronizadas do GHL aparecerao com o canal correto (instagram, whatsapp, etc.)
- Respostas enviadas a partir do Inbox serao encaminhadas pelo GHL corretamente
- Conversas existentes serao corrigidas na proxima sincronizacao

