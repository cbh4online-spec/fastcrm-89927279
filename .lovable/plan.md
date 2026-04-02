

## Diagnóstico

Os logs revelam a causa exacta do problema:

```
SET_WEBHOOK status=400 body={"status":400,"error":"Bad Request","response":{"message":[["instance requires property \"webhook\""]]}}
```

**E zero logs no `whatsapp-evolution-webhook`** — a Evolution API nunca enviou um único evento.

**Causa raiz:** O body do `POST /webhook/set/` está errado. O código envia as propriedades directamente (`url`, `enabled`, `events`), mas a Evolution API espera que estejam dentro de uma propriedade `webhook`:

```text
ACTUAL (falha):   { url, enabled, events }
EXPECTED:         { webhook: { url, enabled, events } }
```

Como a instância já existe (403), o webhook do `create` nunca é aplicado, e o `set` falha com 400. Resultado: zero webhooks → zero eventos → sync suspensa.

## Plano

### Ficheiro: `supabase/functions/whatsapp-qr-connect/index.ts`

Envolver o body do `POST /webhook/set/` numa propriedade `webhook`:

```typescript
body: JSON.stringify({
  webhook: {
    url: webhookUrl,
    enabled: true,
    events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    webhook_by_events: false,
    webhook_base64: false,
  },
}),
```

Aplicar esta correcção em **todos os locais** onde `webhook/set` é chamado (linha ~107 e eventualmente dentro do bloco de reconnect/sync).

### Ficheiros adicionais a verificar

- `supabase/functions/whatsapp-qr-sync/index.ts` — se também chama `webhook/set`, corrigir o body
- `supabase/functions/whatsapp-qr-reconnect/index.ts` — idem

### Critérios de Aceitação

- `SET_WEBHOOK` retorna 200/201 (não 400)
- `whatsapp-evolution-webhook` começa a receber logs de eventos
- `sync_health` muda de `suspended` para `active` ao receber mensagem
- Nenhuma alteração no frontend necessária

