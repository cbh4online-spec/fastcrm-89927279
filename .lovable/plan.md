
# Corrigir Autopilot que nao responde apos mensagem manual

## Problema identificado

Quando envias uma mensagem manualmente pela Inbox, o sistema guarda essa mensagem com o teu `sender_id`. Quando o cliente responde, o autopilot verifica a ultima mensagem de saida e encontra um `sender_id` humano -- e entra em modo "sleep" (pausa), assumindo que um humano esta a tratar da conversa.

Este comportamento e controlado pela opcao `sleep_on_human_reply` (linha 856 do `ghl-webhook-message`). O autopilot faz exatamente o que esta programado, mas o resultado e que nunca responde automaticamente numa conversa onde o utilizador ja tenha enviado uma mensagem manual.

## Solucao

Alterar a logica de `sleep_on_human_reply` para verificar nao apenas se o ultimo outbound tem `sender_id`, mas tambem se houve um inbound DEPOIS desse outbound humano. Se o cliente ja respondeu a mensagem humana, o autopilot deve retomar automaticamente.

Logica atual:
```text
ultimo outbound tem sender_id? --> SLEEP (sempre)
```

Logica corrigida:
```text
ultimo outbound tem sender_id?
  --> houve inbound DEPOIS desse outbound? --> CONTINUAR (cliente respondeu)
  --> nao houve inbound depois? --> SLEEP (humano ainda a tratar)
```

Isto permite que:
- Envies uma mensagem manual
- O cliente responda
- O autopilot retome e responda automaticamente

## Detalhes tecnicos

### Ficheiro: `supabase/functions/ghl-webhook-message/index.ts`

**Linhas 855-877** - Alterar o bloco `sleep_on_human_reply`:

Atual:
```typescript
if (autopilotConfig.sleep_on_human_reply) {
  const { data: lastOutbound } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOutbound?.sender_id) {
    console.log("[AUTOPILOT] Human agent replied, sleeping autopilot");
    // ... log event and return
  }
}
```

Corrigido:
```typescript
if (autopilotConfig.sleep_on_human_reply) {
  const { data: lastOutbound } = await supabase
    .from("messages")
    .select("sender_id, sent_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOutbound?.sender_id) {
    // Check if there was an inbound AFTER the human reply
    const { data: inboundAfterHuman } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .gt("sent_at", lastOutbound.sent_at)
      .limit(1)
      .maybeSingle();

    if (!inboundAfterHuman) {
      // No client reply after human message - stay sleeping
      console.log("[AUTOPILOT] Human agent replied, no client response yet, sleeping");
      // ... log event and return
    } else {
      // Client responded after human message - autopilot can resume
      console.log("[AUTOPILOT] Client replied after human message, autopilot resuming");
    }
  }
}
```

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ghl-webhook-message/index.ts` | Ajustar logica sleep_on_human_reply para verificar se houve inbound apos mensagem humana |

## Resultado esperado

- Envias mensagem manual pela Inbox
- Cliente responde
- Autopilot retoma automaticamente e gera resposta AI
- Se o cliente ainda NAO respondeu a mensagem manual, o autopilot permanece em pausa
