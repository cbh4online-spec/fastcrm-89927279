
# Plano: Responder a Mensagens Instagram via GHL

## Resumo do Problema
As mensagens recebidas do Instagram via GoHighLevel chegam correctamente ao FastCRM, mas quando tentas responder, o sistema está a tentar usar a edge function `instagram-send-message` (integração directa Meta) em vez de enviar via GHL.

## Solução
Actualizar a lógica de routing no hook `useSendMessage` para que **conversas Instagram que vêm do GHL** usem a edge function `ghl-send-message` (que já suporta o tipo `"IG"`).

## Mudança Necessária

**Ficheiro:** `src/hooks/useMessages.ts`

**Alteração:** Expandir a condição que detecta conversas GHL para incluir o canal `instagram`:

```text
ANTES (linha 142):
  if (isGHLConversation && ["sms", "whatsapp"].includes(conversation.channel))

DEPOIS:
  if (isGHLConversation && ["sms", "whatsapp", "instagram", "messenger", "facebook"].includes(conversation.channel))
```

Esta mudança simples garante que:
- Mensagens Instagram recebidas via GHL sejam respondidas via GHL
- O mapeamento `instagram` -> `IG` na edge function `ghl-send-message` envia correctamente para o GHL
- O GHL encaminha a resposta para o Instagram/Meta

---

## Detalhes Técnicos

### Fluxo Actual (com bug)
```text
Instagram DM → Meta → GHL → ghl-webhook-message → FastCRM (channel=instagram)
                                                         ↓
Utilizador responde → useSendMessage → instagram-send-message ❌ (erro: não há conexão directa Meta)
```

### Fluxo Corrigido
```text
Instagram DM → Meta → GHL → ghl-webhook-message → FastCRM (channel=instagram, source=ghl)
                                                         ↓
Utilizador responde → useSendMessage → ghl-send-message (type=IG) → GHL → Meta ✅
```

### Código Existente que Já Suporta Isto

**ghl-send-message (linhas 300-314):**
```typescript
function mapChannelToGHLType(channel: string): string {
  const typeMap: Record<string, string> = {
    "instagram": "IG",     // ✅ Já mapeado
    "messenger": "FB",     // ✅ Facebook Messenger
    "facebook": "FB",      // ✅ Facebook
    // ...outros canais
  };
  return typeMap[channel.toLowerCase()] || "SMS";
}
```

### Impacto
- **Sem risco:** A edge function `ghl-send-message` já está preparada
- **Sem alterações na base de dados**
- **Compatível:** Conversas Instagram directas (sem GHL) continuam a usar `instagram-send-message`
