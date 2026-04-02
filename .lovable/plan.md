

## Diagnóstico

Os logs confirmam o ciclo:
1. `CREATE` → 403 (instância já existe)
2. `CONNECT` → 200 mas body = `{"count":0}` (sem QR code)
3. `connectionState` → `{"instance":{"state":"connecting"}}` (presa)
4. Nenhum estado é "open"/"connected" → cai no erro

**Causa raiz:** A instância está **presa no estado "connecting"** na Evolution API. O endpoint `/instance/connect/` não retorna QR quando a instância está neste estado intermédio. É necessário **reiniciar a instância** (via `/instance/restart/`) antes de reconectar para obter um QR fresco.

## Plano

### 1. Edge Function — adicionar restart para estado "connecting"

**Ficheiro:** `supabase/functions/whatsapp-qr-connect/index.ts`

Quando o connect retorna sem QR e o fallback detecta `state === "connecting"`:

1. Chamar `GET /instance/restart/{instanceName}` para resetar a instância
2. Aguardar 2 segundos (`setTimeout`)
3. Repetir o `GET /instance/connect/{instanceName}` para obter o QR
4. Se continuar sem QR, aí sim retornar o erro estruturado

Lógica (pseudo-código):
```
if (fallbackState === "connecting") {
  // Restart instance
  await fetch(`${baseUrl}/instance/restart/${instanceName}`, { GET, apikey })
  await delay(2000)
  // Retry connect
  const retryRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, ...)
  // Extract QR from retry response
  if (retryQR) → return QR
}
```

### 2. Frontend — sem alterações necessárias

O `WhatsAppQRDialog.tsx` já trata correctamente os 3 cenários (QR, alreadyConnected, error). A correcção é 100% server-side.

### Detalhes Técnicos

- **Endpoint usado:** `GET /instance/restart/{instanceName}` (Evolution API v2)
- **Delay de 2s** entre restart e reconnect para dar tempo à instância reiniciar
- **Retry único** — não criar loops infinitos
- **Logging** de cada passo para rastreabilidade
- Deploy automático da edge function após alteração

### Critérios de Aceitação
- Instância em "connecting" é reiniciada automaticamente e retorna QR
- Instância "open"/"connected" continua a funcionar (sem regressão)
- Logs registam `RESTART` e `RETRY_CONNECT`
- Se após restart ainda não houver QR, erro estruturado mantém-se

