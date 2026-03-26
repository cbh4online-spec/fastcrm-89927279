

# Fix "Conectar via Meta" + Adicionar Conexão via QR Code

## Problema Encontrado

O botão "Conectar via Meta" não faz nada porque existe um **mismatch entre o backend e o frontend**:

- A edge function `whatsapp-auth-url` retorna `{ authUrl: "..." }`
- O frontend procura `data?.url`
- Resultado: `data.url` é `undefined`, o `window.open` nunca é chamado, e nenhum erro aparece ao utilizador

## Plano

### 1. Corrigir o mismatch `authUrl` vs `url`

**Ficheiro**: `src/components/settings/WhatsAppConfigPanel.tsx` (linha 84)

Alterar `data?.url` para `data?.authUrl` no `handleConnect`. Adicionar também um `else` com `toast.error` caso a URL não venha na resposta (ex: META_APP_ID não configurado).

### 2. Adicionar opção de conexão via QR Code

Adicionar um segundo método de conexão ao painel, usando a **Evolution API** (ou API compatível com Baileys) como ponte:

**Abordagem**:
- No painel desconectado, mostrar **dois botões**: "Conectar via Meta" (Cloud API oficial) e "Conectar via QR Code" (via Evolution API)
- Ao clicar em "QR Code", chamar uma nova edge function `whatsapp-qr-connect` que:
  1. Cria uma instância na Evolution API para o workspace
  2. Retorna o QR code em base64
- Mostrar o QR num diálogo modal com refresh automático (polling a cada 5s)
- Quando o utilizador lê o QR com o WhatsApp, a Evolution API notifica via webhook e a conexão é guardada na tabela `whatsapp_connections`

**Novos ficheiros**:
- `supabase/functions/whatsapp-qr-connect/index.ts` — gera instância + retorna QR
- `supabase/functions/whatsapp-qr-status/index.ts` — verifica se o QR já foi lido
- `src/components/settings/WhatsAppQRDialog.tsx` — modal com QR code e polling

**Ficheiros editados**:
- `src/components/settings/WhatsAppConfigPanel.tsx` — fix do bug + dois botões de conexão
- Tabela `whatsapp_connections` — adicionar coluna `connection_type` (`cloud_api` | `evolution`) via migração

**Segredos necessários**:
- `EVOLUTION_API_URL` — URL da instância Evolution API
- `EVOLUTION_API_KEY` — API key da Evolution

### 3. Diferença entre os dois métodos

| | Cloud API (Meta) | QR Code (Evolution) |
|---|---|---|
| Autenticação | OAuth + Meta Business | Scan QR no WhatsApp |
| Número | Business dedicado | Número pessoal/business |
| Mensagens | Templates aprovados | Livre |
| Webhooks | Meta Cloud | Evolution API |
| Custo | Grátis (pay per conversation) | Self-hosted |

## Secção Técnica

**Bug fix** (linha 84 do `WhatsAppConfigPanel.tsx`):
```
// Antes:
if (data?.url) { window.open(data.url, "_blank"); }

// Depois:  
if (data?.authUrl) { window.open(data.authUrl, "_blank"); }
else { toast.error("URL de autorização não recebida"); }
```

**QR Dialog**: Modal com `<img src={qrBase64} />`, timer de expiração (60s), e polling via `useQuery` com `refetchInterval: 5000` para verificar status da conexão.

**Migração SQL**:
```sql
ALTER TABLE whatsapp_connections 
ADD COLUMN connection_type text DEFAULT 'cloud_api' 
CHECK (connection_type IN ('cloud_api', 'evolution'));
```

