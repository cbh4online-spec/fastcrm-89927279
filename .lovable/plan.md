

# Plano: WhatsApp QR Recovery Flow

## Diagnóstico

O sistema já tem health-check (`whatsapp-qr-status`) e resync (`whatsapp-qr-sync`) com inferência de sync health. Faltam:

1. **DB** — campos de recovery state (`recovery_state`, `recovery_attempt_count`, `recovery_last_attempt_at`)
2. **Soft reconnect** — edge function que faz restart da sessão sem destruir a instância (preserva conversas)
3. **Repair required** — estado explícito quando recovery falha repetidamente
4. **UI recovery actions** — botões contextuais de Resync / Reconnect / Clean Re-pair quando sync não é active
5. **Hook mutations** — `useReconnectWhatsAppQR` no frontend

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migration SQL | CRIAR — `recovery_state`, `recovery_attempt_count`, `recovery_last_attempt_at`, `last_reconnect_at` |
| `supabase/functions/whatsapp-qr-reconnect/index.ts` | CRIAR — soft reconnect via Evolution API (restart session, re-fetch state) |
| `supabase/functions/whatsapp-qr-sync/index.ts` | EDITAR — persistir recovery_state, escalate logic |
| `supabase/functions/whatsapp-qr-status/index.ts` | EDITAR — persistir recovery_state |
| `src/hooks/useWhatsAppQRConnection.ts` | EDITAR — tipo + mutation `useReconnectWhatsAppQR` |
| `src/components/integrations/WhatsAppConnectionCard.tsx` | EDITAR — recovery actions contextuais |
| `src/components/settings/WhatsAppConfigPanel.tsx` | EDITAR — recovery info + actions |

## Detalhes Técnicos

### 1. Migration — Recovery columns
```sql
ALTER TABLE whatsapp_qr_connections
  ADD COLUMN recovery_state text NOT NULL DEFAULT 'none',
  ADD COLUMN recovery_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN recovery_last_attempt_at timestamptz,
  ADD COLUMN last_reconnect_at timestamptz;
-- CHECK: recovery_state IN ('none','checking','resyncing','reconnecting','repair_required','repaired','failed')
```

### 2. Edge Function: `whatsapp-qr-reconnect`
- Busca instância do DB
- Chama Evolution API `POST /instance/restart/{instanceName}` (soft restart)
- Se restart falhar, tenta `GET /instance/connect/{instanceName}` (re-connect)
- Re-avalia connection state + sync health
- Se 3+ tentativas falhadas → marca `recovery_state = 'repair_required'`
- Incrementa `recovery_attempt_count`
- Persiste tudo no DB
- Logs estruturados

### 3. Refactor `whatsapp-qr-sync` e `whatsapp-qr-status`
- Após inferir sync health, determinar recovery_state:
  - Se `sync_health = active` → `recovery_state = 'none'`, reset counter
  - Se `sync_health = delayed/degraded` e `recovery_attempt_count < 3` → manter `recovery_state` actual
  - Se `sync_health = suspended/failed` e `recovery_attempt_count >= 3` → `recovery_state = 'repair_required'`

### 4. Hook — `useReconnectWhatsAppQR`
Nova mutation que chama `whatsapp-qr-reconnect`. Tipo `WhatsAppQRConnection` recebe `recovery_state`, `recovery_attempt_count`, `recovery_last_attempt_at`.

### 5. UI — Recovery actions contextuais
Quando `sync_health !== 'active'` e `isConnected`:
- Botão "Resincronizar" (chama sync existente)
- Botão "Reconectar" (chama reconnect novo)
- Se `recovery_state === 'repair_required'`: warning prominente + botão "Iniciar nova ligação" (disconnect + QR dialog)
- Disable duplicados enquanto mutation está pending
- Mostrar `recovery_state` e `recovery_attempt_count` na info area

## Critérios de Aceitação

1. DB tem `recovery_state` separado de `status` e `sync_health`
2. Soft reconnect tenta preservar instância antes de destruir
3. Após 3 falhas, `repair_required` é explícito
4. UI mostra acções de recovery contextuais
5. Clean re-pair só é sugerido quando recovery falha
6. Conversas não são destruídas em soft reconnect
7. Logs estruturados para todo o fluxo de recovery

