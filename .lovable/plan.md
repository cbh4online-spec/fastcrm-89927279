

# Plano: Dual Health Model — Connection State + Sync Health

## A. Causa Raiz

O campo `status` mistura estado de conexão com saúde de sincronização. Uma sessão Evolution API pode estar `open` (connected) mas com sync de histórico suspenso no dispositivo móvel. O sistema actual mostra "Conectado" verde, o que é enganador.

## B. Alterações Necessárias

### 1. Migration SQL — Adicionar campos de sync health

Novas colunas em `whatsapp_qr_connections`:
- `sync_health` TEXT DEFAULT 'unknown' — valores: active, delayed, suspended, degraded, failed, unknown
- `last_sync_at` TIMESTAMPTZ
- `last_successful_sync_at` TIMESTAMPTZ
- `sync_issue_reason` TEXT
- `last_health_check_at` TIMESTAMPTZ
- `last_inbound_message_at` TIMESTAMPTZ
- `last_outbound_message_at` TIMESTAMPTZ

CHECK constraint para `sync_health` com os 6 valores permitidos.

### 2. Edge Function: `whatsapp-qr-status` — Refactor

Após verificar `connectionState` e `fetchInstances`, adicionar lógica de inferência de sync health:
- Se connected + última mensagem inbound recente (< 5 min) → `active`
- Se connected + sem mensagens inbound há > 30 min mas instância recente → `delayed`
- Se connected + sem mensagens inbound há > 2h → `suspended`
- Se connected mas sem dados para inferir → `unknown`
- Se disconnected → `failed`

Consultar tabela `messages` para verificar última actividade inbound/outbound do workspace.

Persistir `sync_health`, `last_health_check_at`, `sync_issue_reason` no upsert.

Retornar ambos os campos na resposta:
```json
{
  "connection_state": "connected",
  "sync_health": "suspended",
  "sync_issue_reason": "Sem mensagens inbound há mais de 2 horas",
  "last_health_check_at": "..."
}
```

### 3. Edge Function: `whatsapp-qr-sync` — Mesmo refactor

Aplicar a mesma lógica de inferência de sync health.

### 4. Edge Function: `whatsapp-evolution-webhook` — Update

Ao receber mensagem inbound, actualizar `last_inbound_message_at` e `sync_health = 'active'` na tabela.

### 5. Hook: `useWhatsAppQRConnection` — Expor novos campos

Adicionar `sync_health`, `last_health_check_at`, `sync_issue_reason`, `last_inbound_message_at`, `last_outbound_message_at` ao type `WhatsAppQRConnection`.

### 6. UI: `WhatsAppConnectionCard.tsx` — Dual badges

Refactor para mostrar:
- Badge 1: Connection State (Conectado/Desconectado/etc.)
- Badge 2: Sync Health (Ativo/Suspenso/Degradado/Desconhecido/Falhou)

Lógica de cores:
- Verde: connected + active
- Âmbar: connected + (delayed | suspended | degraded | unknown)
- Vermelho: disconnected | failed

Mostrar `sync_issue_reason` quando disponível.
Mostrar `last_health_check_at` formatado.

### 7. UI: `WhatsAppConfigPanel.tsx` — Mesma lógica dual

Adicionar segunda linha com sync health badge e info contextual.

## C. Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migration SQL | CRIAR — novos campos sync health |
| `supabase/functions/whatsapp-qr-status/index.ts` | EDITAR — inferir sync health |
| `supabase/functions/whatsapp-qr-sync/index.ts` | EDITAR — inferir sync health |
| `supabase/functions/whatsapp-evolution-inbound/index.ts` | EDITAR — update last_inbound_message_at + sync_health |
| `src/hooks/useWhatsAppQRConnection.ts` | EDITAR — novos campos no type |
| `src/components/integrations/WhatsAppConnectionCard.tsx` | EDITAR — dual badges |
| `src/components/settings/WhatsAppConfigPanel.tsx` | EDITAR — dual badges |

## D. Critérios de Aceitação

1. DB tem `sync_health` separado de `status`
2. Backend infere sync health com base em actividade real
3. UI mostra dois badges distintos (conexão + sincronização)
4. "Connected + Sync Suspended" é um estado visível e claro
5. Verde só quando ambos saudáveis
6. Unknown não é mostrado como saudável
7. Refresh health actualiza ambos os campos

