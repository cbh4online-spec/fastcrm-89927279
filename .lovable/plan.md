

# Enviar WhatsApp via Evolution API (QR) em vez de GHL

## Problema

O diálogo "Nova Mensagem WhatsApp" (screenshot) mostra "Integração GHL activa" e envia mensagens via GoHighLevel (`ghl-send-message`). O sistema deveria usar a Evolution API (QR) como motor de envio de WhatsApp — consistente com a integração QR que acabámos de refactorizar.

## Alterações necessárias

### 1. Nova Edge Function: `whatsapp-evolution-send`

Criar `supabase/functions/whatsapp-evolution-send/index.ts`:
- Recebe `{ workspaceId, phone, message }` 
- Valida JWT + pertença ao workspace
- Consulta `whatsapp_qr_connections` para obter `instance_name` e verificar `status === 'connected'`
- Chama Evolution API: `POST /message/sendText/{instanceName}` com body `{ number, text }`
- Retorna sucesso/erro com CORS headers

### 2. Novo Diálogo: `QuickEvolutionWhatsAppDialog.tsx`

Criar componente dedicado (baseado na estrutura do `QuickGHLChannelDialog`) que:
- Usa `useWhatsAppQRConnection()` para verificar se há conexão activa (em vez de `useWorkspaceGHLConfig`)
- Mostra "WhatsApp (Evolution QR) conectado" quando `status === 'connected'`
- Mostra aviso + botão "Ir para Definições" quando não conectado
- Envia mensagem via `supabase.functions.invoke("whatsapp-evolution-send")`
- Cria lead + conversa + mensagem outbound (reutilizando `composeHelpers`)

### 3. Alterar `ComposeButton.tsx`

- Importar `QuickEvolutionWhatsAppDialog` e `useWhatsAppQRConnection`
- No canal WhatsApp: verificar `whatsappQRConnection?.status === 'connected'` em vez de `isGHLConfigured`
- Ao clicar WhatsApp: abrir `QuickEvolutionWhatsAppDialog` em vez de `QuickGHLChannelDialog`
- Manter GHL para SMS e Facebook (sem alteração)

### 4. Ficheiros afectados

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/whatsapp-evolution-send/index.ts` | CRIAR |
| `src/components/inbox/QuickEvolutionWhatsAppDialog.tsx` | CRIAR |
| `src/components/inbox/ComposeButton.tsx` | EDITAR — WhatsApp usa Evolution |

### 5. Formato do número na Evolution API

A Evolution API espera número no formato `5511999999999` (código do país + número, sem `+`). A normalização strip `+` e caracteres não numéricos antes de enviar.

## Critérios de aceitação

- Clicar "WhatsApp" na Inbox abre o diálogo com "WhatsApp (Evolution QR) conectado"
- Mensagem é enviada via Evolution API `/message/sendText`
- Se não houver conexão QR activa, mostra aviso com link para Settings
- Lead, conversa e mensagem são criados no FastCRM
- SMS e Facebook continuam via GHL (sem regressão)

