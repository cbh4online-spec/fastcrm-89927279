

## Diagnóstico

Os logs mostram um padrão consistente e repetitivo:

1. `CREATE` → 403 (instância já existe)
2. `CONNECT` → `{"count":0}` (sem QR)
3. `connectionState` → `"connecting"` (presa)
4. `RESTART` (PUT) → executa mas **não resolve**
5. `RETRY CONNECT` → ainda `{"count":0}`

**Causa raiz:** O `PUT /instance/restart/` não está a limpar o estado "connecting" na Evolution API. A instância continua presa. O restart não é suficiente — é necessário **eliminar e recriar a instância** para obter um QR fresco.

## Plano

### Edge Function `whatsapp-qr-connect/index.ts`

Quando a instância está presa em "connecting" e o restart falhou (retry connect continua sem QR):

1. **Substituir restart por delete + recreate:**
   - Após detectar `state === "connecting"`, chamar `DELETE /instance/delete/${instanceName}` em vez de restart
   - Aguardar 1s
   - Recriar a instância via `POST /instance/create` (com `qrcode: true`)
   - Chamar `GET /instance/connect/${instanceName}` para obter o QR

2. **Manter o restart como primeira tentativa** (pode funcionar em alguns casos), mas se o retry falhar, escalar para delete+recreate.

3. **Fluxo revisto:**
```text
connecting detectado
  → RESTART (PUT)
  → wait 2s
  → RETRY CONNECT
  → se QR → retorna ✓
  → se ainda sem QR:
    → DELETE instância
    → wait 1s
    → CREATE nova instância
    → CONNECT
    → se QR → retorna ✓
    → se falhar → erro estruturado
```

### Ficheiros a alterar
- `supabase/functions/whatsapp-qr-connect/index.ts` — adicionar lógica de delete+recreate após falha do restart

### Sem alterações no frontend
O `WhatsAppQRDialog.tsx` já trata os cenários correctamente.

### Critérios de Aceitação
- Instância presa em "connecting" é eliminada e recriada, retornando QR
- Logs registam `DELETE`, `RECREATE`, `RETRY_CONNECT_AFTER_RECREATE`
- Se delete+recreate também falhar, retorna erro estruturado (200 com `needsReconnect`)
- Instâncias "open"/"connected" não são afectadas

