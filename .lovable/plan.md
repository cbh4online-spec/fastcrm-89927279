

## Diagnóstico

O erro **"Edge Function returned a non-2xx status code"** vem da edge function `whatsapp-qr-connect` que retorna **HTTP 500** com a mensagem `"QR code not available. Try again."`.

**Causa raiz:** Quando a instância já existe na Evolution API (resposta 403 no create), o código chama `/instance/connect/{instanceName}`. A resposta não contém QR code (instância já está ligada ou num estado intermédio), mas o check `connectData?.instance?.state === "open"` **não corresponde** ao formato real da resposta da Evolution API. A resposta pode ter a estrutura `{ state: "open" }` directamente, ou variantes como `{ status: "open" }`, em vez de `{ instance: { state: "open" } }`.

O código não loga a resposta do connect, o que dificulta o debug. Sem match, cai no fallback (linha 124) e retorna 500.

## Plano de Implementação

### 1. Melhorar `whatsapp-qr-connect/index.ts`

**Alterações na secção connect (linhas 95-125):**

- **Logar a resposta do connect** para visibilidade: `console.log("[WHATSAPP_QR] CONNECT_RESPONSE", JSON.stringify(connectData).substring(0, 500))`
- **Ampliar a detecção de "já conectado"** para cobrir múltiplos formatos da Evolution API:
  ```
  const state = connectData?.instance?.state 
    || connectData?.state 
    || connectData?.status;
  if (state === "open" || state === "connected") { ... }
  ```
- **Fallback: verificar estado via `/instance/connectionState/`** se o connect não retorna QR nem indica "open". Isto resolve o caso em que a instância está ligada mas o endpoint connect não indica isso directamente.
- **Retornar 200 com erro estruturado** em vez de 500 quando o QR não está disponível (padrão resiliente do projecto), incluindo uma flag `needsReconnect: true` para que o frontend possa guiar o utilizador.

### 2. Melhorar tratamento de erro no `WhatsAppQRDialog.tsx`

- Quando `data?.error` existe mas HTTP é 200, mostrar a mensagem de erro ao utilizador sem o toast genérico do SDK.
- Adicionar distinção entre "QR não disponível" (sugerir desconectar e reconectar) e erros de configuração.

### Detalhes Técnicos

**Ficheiros a alterar:**
- `supabase/functions/whatsapp-qr-connect/index.ts` — logging + detecção de estado ampliada + fallback connectionState + resposta resiliente
- `src/components/settings/WhatsAppQRDialog.tsx` — tratamento de novos cenários de resposta

**Impacto:** Apenas o fluxo de conexão WhatsApp QR. Sem impacto noutros componentes.

### Critérios de Aceitação
- Abrir o diálogo QR com instância já conectada → mostra "Já conectado" sem erro
- Abrir o diálogo QR com instância desconectada → mostra QR code normalmente
- Logs da edge function registam a resposta do connect para debug futuro
- Nenhum erro 500 para cenários esperados (instância já ligada)

