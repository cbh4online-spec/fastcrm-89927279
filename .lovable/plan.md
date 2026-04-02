

## Diagnóstico

O webhook **está a funcionar**. Os logs confirmam:
- `SET_WEBHOOK status=201` — webhook registado com sucesso
- `whatsapp-evolution-webhook` recebeu eventos: `connection.update (state=open)`, `qrcode.updated`
- DB mostra `status=connected`, `connected_at=09:03:30`, `recovery_state=none`

**Problema residual:** `sync_health` continua "suspended" porque o `whatsapp-qr-status` (polling do frontend) recalcula `sync_health` com base em `last_inbound_message_at` da tabela `messages`. Como a última mensagem inbound foi há 87h, cada poll sobrescreve `sync_health → suspended`, anulando o que o webhook colocou como "active".

A arquitectura proposta no ficheiro enviado é uma reimplementação completa com nomes e tabelas diferentes — não é necessária. O sistema actual já funciona, falta apenas corrigir a lógica de inferência de saúde.

## Plano

### 1. Corrigir `whatsapp-qr-status/index.ts` — lógica `inferSyncHealth`

Quando a conexão é "connected" e há pouca/nenhuma actividade de mensagens, o estado deve ser "active" (não "suspended") se a conexão é recente. A ausência de mensagens inbound não significa falha — pode simplesmente não haver mensagens novas.

**Alteração na função `inferSyncHealth`:**
- Se `connectionStatus === "connected"` e não há mensagens inbound recentes, verificar `connected_at` / `last_seen_at`
- Se a conexão foi estabelecida recentemente (< 2h), considerar "active" independentemente de mensagens
- Só marcar "suspended" se não houver actividade inbound NEM actualização de conexão há mais de 24h

Passar `connectedAt` e `lastSeenAt` como parâmetros adicionais à função.

### 2. Corrigir `whatsapp-qr-sync/index.ts` — mesma lógica

Aplicar a mesma correcção na função `computeSyncHealth` para não sobrescrever `sync_health` com base apenas em mensagens.

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `supabase/functions/whatsapp-qr-status/index.ts` | Corrigir `inferSyncHealth` para considerar `connected_at`/`last_seen_at` |
| `supabase/functions/whatsapp-qr-sync/index.ts` | Corrigir lógica equivalente |

### Critérios de Aceitação

- Conexão "connected" com 0 mensagens recentes mostra `sync_health: active` (não "suspended")
- `sync_health` só muda para "suspended" após 24h sem qualquer actividade (mensagens ou conexão)
- Frontend mostra estado correcto sem oscilar entre "active" e "suspended"

### Sobre o ficheiro enviado

O prompt sugere uma reimplementação completa com funções novas (`whatsapp-evolution-init`, `whatsapp-webhook`, `whatsapp-evolution-sync`) e tabela diferente (`integrations` em vez de `whatsapp_qr_connections`). **Não é necessário** — o sistema actual já está funcional após a correcção do webhook. A única correcção pendente é a lógica de `sync_health`.

