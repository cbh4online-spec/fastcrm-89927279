

# Plano: WhatsApp QR Backend — Correções Finais

## A. Diagnóstico

**Estado actual:** A integração está **funcional** — instance creation, QR generation, polling, status sync, disconnect, e send estão todos implementados e a funcionar.

**DB actual:** `status=connected`, `phone_number=null` — o número não está a ser extraído da Evolution API.

**Problemas identificados:**

### 1. Phone number null quando conectado (Bug principal)
A função `fetchInstances` da Evolution API provavelmente retorna o `owner` num campo diferente do esperado. O código tenta `instance?.instance?.owner || instance?.owner` mas o campo pode ser `instance?.instance?.profilePictureUrl` ou o número pode estar em `instance?.instance?.profileName` ou noutro formato. O `catch {}` vazio silencia o erro.

**Fix:** Adicionar logging ao bloco de fetch de phone number nas funções `whatsapp-qr-status` e `whatsapp-qr-sync` para diagnosticar o formato real. Tentar paths alternativos (`instance?.instance?.wuid`, `instance?.instance?.profileName`, `instance?.number`).

### 2. Sem webhook de estado da Evolution API
Não existe endpoint para receber webhooks da Evolution API. O sistema depende exclusivamente de polling, o que funciona mas adiciona latência de ~4s.

**Fix:** Criar edge function `whatsapp-evolution-webhook` para receber eventos `CONNECTION_UPDATE` da Evolution API e actualizar o estado em tempo real.

---

## B. Ficheiros a Criar/Alterar

| Ficheiro | Acção | Descrição |
|---|---|---|
| `supabase/functions/whatsapp-qr-status/index.ts` | EDITAR | Adicionar logging ao fetch de phone number, testar paths alternativos |
| `supabase/functions/whatsapp-qr-sync/index.ts` | EDITAR | Mesmo fix de phone number + logging |
| `supabase/functions/whatsapp-evolution-webhook/index.ts` | CRIAR | Webhook receiver para eventos da Evolution API |

---

## C. Detalhes Técnicos

### Fix do Phone Number (status + sync)
```typescript
// Substituir o bloco try/catch silencioso por:
try {
  const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
    method: "GET",
    headers: { apikey: EVOLUTION_API_KEY },
  });
  const infoData = await infoRes.json();
  console.log(`[WHATSAPP_QR] FETCH_INSTANCES raw=${JSON.stringify(infoData).substring(0, 500)}`);
  const instance = Array.isArray(infoData) ? infoData[0] : infoData;
  // Try multiple known Evolution API response paths
  phoneNumber = instance?.instance?.owner 
    || instance?.instance?.wuid?.split("@")?.[0]
    || instance?.owner
    || instance?.number
    || null;
  if (phoneNumber && phoneNumber.includes("@")) {
    phoneNumber = phoneNumber.split("@")[0];
  }
  console.log(`[WHATSAPP_QR] PHONE_EXTRACTED phone=${phoneNumber}`);
} catch (e) {
  console.warn(`[WHATSAPP_QR] FETCH_INSTANCES_FAILED error=${e.message}`);
}
```

### Webhook Receiver (nova edge function)
- Recebe POST da Evolution API com eventos `CONNECTION_UPDATE`
- Valida `WEBHOOK_SECRET` se configurado
- Mapeia estado Evolution → FastCRM
- Actualiza `whatsapp_qr_connections` e `whatsapp_connections`
- Logs estruturados com workspace_id, instance_name, status

### Configurar webhook na Evolution API
Após deploy, configurar o webhook da Evolution API para apontar para:
`https://<SUPABASE_URL>/functions/v1/whatsapp-evolution-webhook`

---

## D. O que já está bem implementado (não alterar)

- ✅ 4 edge functions: connect, status, sync, disconnect
- ✅ Edge function send com auth + workspace membership
- ✅ Instance name determinístico (`ws_{workspaceId}`)
- ✅ DB table `whatsapp_qr_connections` com todos os statuses
- ✅ Polling automático no hook (5s para estados transitórios)
- ✅ UI card com 10 estados granulares
- ✅ QR Dialog com countdown + polling + auto-close
- ✅ CORS manual em todas as funções
- ✅ URL sanitization em todas as funções
- ✅ Sync bidireccional com `whatsapp_connections` para inbox

---

## E. Critérios de Aceitação

1. Phone number extraído correctamente quando conectado
2. Logs visíveis para debug do formato da resposta fetchInstances
3. Webhook receiver deployed e funcional (opcional — polling já funciona)
4. Sem regressão nos fluxos existentes

