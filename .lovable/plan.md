
## Conectar Instagram e WhatsApp Diretamente (sem GHL)

### Contexto

O Instagram direto ja tem implementacao completa (edge functions `instagram-auth-url`, `instagram-oauth-callback`, `instagram-webhook`, `instagram-send-message` + componente `InstagramConnectionCard`). Os secrets `META_APP_ID` e `META_APP_SECRET` ja estao configurados.

O WhatsApp Business API direto nao tem nenhuma implementacao -- nao existe tabela, edge functions, nem UI para conexao directa.

### O que sera feito

**1. Tornar o botao Instagram visivel e funcional (mesmo com GHL)**

Atualmente, o `InstagramConnectionCard` ja esta presente mas o banner "Via GHL" pode confundir. Vamos:
- Manter o card do Instagram sempre visivel com botao "Conectar" funcional
- Adicionar nota a indicar que a conexao direta funciona independentemente do GHL
- Ja esta 100% funcional (OAuth flow completo)

**2. Criar conexao directa WhatsApp Business API**

Este e o trabalho principal. Requer:

**Base de Dados:**
- Criar tabela `whatsapp_connections` (workspace_id, phone_number_id, waba_id, display_phone_number, access_token, is_active, token_expires_at, connected_by)
- RLS policies para acesso por workspace

**Edge Functions:**
- `whatsapp-auth-url` -- Gerar URL OAuth do Facebook/Meta para WhatsApp Business (usa os mesmos `META_APP_ID` / `META_APP_SECRET` ja configurados, com scope `whatsapp_business_management,whatsapp_business_messaging`)
- `whatsapp-oauth-callback` -- Receber callback, trocar code por token, buscar WhatsApp Business Account ID e Phone Number ID, guardar na tabela
- `whatsapp-webhook` -- Receber mensagens inbound do WhatsApp Cloud API, criar conversas e mensagens no CRM
- `whatsapp-send-message` -- Enviar mensagens outbound via WhatsApp Cloud API

**UI:**
- Criar componente `WhatsAppConnectionCard` (seguindo o mesmo padrao do `InstagramConnectionCard`)
- Substituir o badge "Em breve" pelo card funcional na secao WhatsApp do `ChannelsSettings`
- Mostrar estado da conexao, numero conectado, opcoes de reconectar/desconectar

**3. Atualizar ChannelsSettings**

- Remover a logica que esconde botoes quando GHL esta ativo
- Mostrar ambas opcoes (Via GHL + Conexao Direta) quando aplicavel
- Cada card indica claramente a fonte da conexao

---

### Detalhes Tecnicos

**Tabela `whatsapp_connections`:**
```text
- id (uuid, PK)
- workspace_id (uuid, FK workspaces, UNIQUE)
- phone_number_id (text)
- waba_id (text) -- WhatsApp Business Account ID
- display_phone_number (text)
- access_token (text)
- is_active (boolean, default true)
- token_expires_at (timestamptz)
- connected_by (uuid)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Edge Functions -- Fluxo OAuth WhatsApp:**
1. Frontend chama `whatsapp-auth-url` com workspaceId + userId
2. Redireciona para `facebook.com/v18.0/dialog/oauth` com scope WhatsApp
3. Meta redireciona para `whatsapp-oauth-callback`
4. Callback troca code por token, busca WABA e Phone Number via Graph API
5. Guarda na tabela e redireciona de volta ao settings

**Edge Function -- Webhook WhatsApp:**
- Verificacao GET (hub.verify_token)
- POST: processa mensagens inbound, cria conversas e mensagens (mesmo padrao do `instagram-webhook`)

**Edge Function -- Send WhatsApp:**
- Recebe conversationId + message
- Busca conexao activa do workspace
- Envia via `graph.facebook.com/v18.0/{phone_number_id}/messages`
- Guarda mensagem outbound na BD

**Componente `WhatsAppConnectionCard`:**
- Mesmo layout do `InstagramConnectionCard`
- Mostra numero conectado, estado do token
- Botoes Conectar / Reconectar / Desconectar

**Hook `useWhatsAppConnection`:**
- Query para buscar conexao activa
- Mutation para desconectar

**Ficheiros a criar:**
- `supabase/functions/whatsapp-auth-url/index.ts`
- `supabase/functions/whatsapp-oauth-callback/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-send-message/index.ts`
- `src/components/integrations/WhatsAppConnectionCard.tsx`
- `src/hooks/useWhatsAppConnection.ts`

**Ficheiros a modificar:**
- `src/components/settings/sections/ChannelsSettings.tsx` -- substituir badge "Em breve" pelo `WhatsAppConnectionCard`, ajustar logica GHL
- Migracao SQL para criar tabela `whatsapp_connections`
