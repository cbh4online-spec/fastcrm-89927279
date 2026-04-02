

## Diagnóstico

O problema **não é o QR code** — esse funciona correctamente. O problema é que **após o scan do QR e conexão bem-sucedida, as mensagens não chegam ao FastCRM**. Os logs confirmam:

```text
evolution=open mapped=connected sync_health=suspended
recovery_state=repair_required
reason=Sem mensagens inbound há mais de 87 horas
```

**Causa raiz identificada — 2 problemas críticos:**

1. **Webhook não configurado na Evolution API:** Quando a instância é criada (linha 73 do `whatsapp-qr-connect`), o `POST /instance/create` **não inclui `webhook`**. Sem webhook, a Evolution API não tem para onde enviar mensagens recebidas.

2. **Edge functions de processamento não existem:** O frontend invoca `whatsapp-evolution-send`, `whatsapp-qr-sync` e `whatsapp-qr-reconnect`, mas **nenhuma destas edge functions existe** no directório `supabase/functions/`. Isto significa que o envio de mensagens, a sincronização manual e a reconexão falham silenciosamente.

## Plano de Implementação

### 1. Configurar webhook no `whatsapp-qr-connect`

Alterar o `POST /instance/create` para incluir o URL do webhook que a Evolution API usará para enviar eventos (mensagens recebidas, estado da conexão, etc.):

```typescript
body: JSON.stringify({
  instanceName,
  qrcode: true,
  integration: "WHATSAPP-BAILEYS",
  webhook: {
    url: `${SUPABASE_URL}/functions/v1/whatsapp-evolution-webhook`,
    enabled: true,
    events: [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE",
      "QRCODE_UPDATED"
    ],
    webhook_by_events: false,
    webhook_base64: false,
  }
})
```

Adicionar também uma chamada `POST /webhook/set/{instanceName}` após a criação para garantir que instâncias já existentes (403) também recebem o webhook.

### 2. Criar edge function `whatsapp-evolution-webhook`

Recebe eventos da Evolution API e processa-os:
- **MESSAGES_UPSERT**: Insere mensagens inbound na tabela `messages`, cria/actualiza conversas
- **CONNECTION_UPDATE**: Actualiza estado em `whatsapp_qr_connections`
- **QRCODE_UPDATED**: Actualiza QR code se necessário
- Usa `SUPABASE_SERVICE_ROLE_KEY` (webhook externo, sem JWT)

### 3. Criar edge function `whatsapp-evolution-send`

Envia mensagens via Evolution API:
- Valida JWT do utilizador + workspace membership
- Chama `POST /message/sendText/{instanceName}`
- Insere mensagem outbound na tabela `messages`

### 4. Criar edge function `whatsapp-qr-sync`

Força re-sincronização:
- Verifica estado da instância via Evolution API
- Actualiza `whatsapp_qr_connections` com estado actual
- Re-configura webhook se necessário

### 5. Criar edge function `whatsapp-qr-reconnect`

Tenta recuperar instância:
- Restart da instância
- Se falhar, delete + recreate (com webhook)
- Actualiza recovery_state

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| `supabase/functions/whatsapp-qr-connect/index.ts` | Adicionar webhook config ao create |
| `supabase/functions/whatsapp-evolution-webhook/index.ts` | **Criar** — recebe eventos da Evolution API |
| `supabase/functions/whatsapp-evolution-send/index.ts` | **Criar** — envia mensagens via Evolution API |
| `supabase/functions/whatsapp-qr-sync/index.ts` | **Criar** — sincronização manual |
| `supabase/functions/whatsapp-qr-reconnect/index.ts` | **Criar** — reconexão com recuperação |

### Critérios de Aceitação

- Instância criada com webhook configurado apontando para `whatsapp-evolution-webhook`
- Mensagens inbound da Evolution API são recebidas e inseridas na tabela `messages`
- Estado da conexão é actualizado em tempo real via webhook (não só por polling)
- `sync_health` passa de "suspended" para "active" quando mensagens começam a chegar
- Envio de mensagens via `whatsapp-evolution-send` funciona correctamente
- Botão "Sincronizar" e "Reconectar" no frontend funcionam sem erro

### Riscos

- A tabela `messages` pode não ter as colunas necessárias — verificar schema antes de implementar
- O webhook precisa de ser acessível publicamente (sem `verify_jwt`) — configurar em `config.toml`
- Instâncias já existentes precisam de actualização do webhook (não basta corrigir o create)

