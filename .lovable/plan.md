

# Corrigir duplicação de path na Evolution API URL

## Diagnóstico
Os logs confirmam que o `EVOLUTION_API_URL` contém um sufixo de caminho (provavelmente `/instance/create`), resultando em URLs duplicados como:
- `POST /instance/create/instance/create` (404)
- `GET /instance/create/instance/connect/ws_...` (404)

O URL truncado nos logs (`https://evolution-api-production-e886.up.railway.app/instanc...`) confirma que o secret tem mais do que apenas o domínio base.

## Solução
Duas abordagens complementares:

### 1. Corrigir o código (defensivo)
Na edge function `whatsapp-qr-connect/index.ts`, após construir `baseUrl`, extrair apenas a origin (scheme + host) para garantir que nunca há paths indesejados:

```typescript
// Linha 49 — substituir
const baseUrl = finalUrl.replace(/\/$/, "");
// por
const parsedUrl = new URL(finalUrl);
const baseUrl = parsedUrl.origin; // apenas scheme + host, sem paths
```

### 2. Re-atualizar o secret (corretivo)
Atualizar `EVOLUTION_API_URL` para conter apenas o domínio base sem qualquer path.

## Ficheiros alterados
- `supabase/functions/whatsapp-qr-connect/index.ts` — sanitizar URL para usar apenas origin

