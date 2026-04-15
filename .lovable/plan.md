

# Plano: Isolamento de Mensagens por Workspace (Routing GHL Multi-Workspace)

## Diagnóstico

O problema é que Metodopare e Blecksen partilham o **mesmo GHL location_id** (sub-conta GoHighLevel). Quando cada workspace faz sync, o `ghl-sync-conversations` puxa **todas** as conversas dessa localização para o workspace que pediu o sync — não filtra por canal ou pertença.

Resultado: Tiago Guimarães e Rui Miguel Pinheiro, que entraram pela Blecksen (provavelmente via Instagram), aparecem também na Metodopare.

### Onde está a falha

1. **`ghl-sync-conversations`** (linha 616-710): itera sobre TODAS as conversas GHL do `locationId` e cria-as no `workspace_id` que pediu o sync, sem verificar se o canal já pertence a outro workspace.
2. **`ghl-webhook-contact`** (linha 108-113): usa `.limit(1)` para resolver o workspace — não determinístico quando múltiplos workspaces partilham o mesmo location.
3. **`ghl-webhook-message`** (linha 259-298): já tem routing por canal (Phase 2), mas o fallback é "primary ou primeiro" — pode enviar para o workspace errado quando a configuração de canais sociais não está completa.

### O que já funciona
- `useConversations` filtra correctamente por `workspace_id` (linha 139).
- O realtime subscription já filtra por `workspace_id` (linha 95).
- O `normalizeIncomingMessage` cria conversas com o `workspace_id` correcto.

## Plano de Implementação

### 1. Filtrar conversas por canal no sync batch (`ghl-sync-conversations`)
- Antes de criar uma conversa, verificar se o canal (instagram, facebook, whatsapp, etc.) está atribuído a este workspace via `workspace_ghl_social_channels`.
- Se o canal pertence a outro workspace, **não criar** a conversa.
- Se o canal é genérico (email, sms) e não há configuração de canais sociais, manter comportamento actual (sync para o workspace que pediu).
- **Nota**: o rollback parcial (linhas 851-855) já existe para canais não permitidos APÓS inferência — mas precisa de ser movido para ANTES da criação.

### 2. Corrigir routing no webhook de contacto (`ghl-webhook-contact`)
- Substituir `.limit(1)` por lógica multi-workspace igual à do `ghl-webhook-message`:
  - Carregar todas as configs activas para o location.
  - Usar `workspace_ghl_social_channels` para determinar o workspace correcto.
  - Fallback para `is_primary`.

### 3. Garantir que a configuração de canais está completa
- Validar que Metodopare e Blecksen têm `workspace_ghl_social_channels` correctamente configurados (e.g., Instagram → Blecksen, Email → Metodopare).
- Se ambos tiverem o mesmo canal activo, o sistema não consegue desambiguar — alertar o utilizador.

### 4. Limpeza de conversas duplicadas (dados existentes)
- Criar um script SQL de limpeza que:
  - Identifica conversas na Metodopare que existem também na Blecksen (mesmo `external_thread_id`)
  - Remove as duplicadas do workspace errado (baseado no canal e configuração de canais sociais)

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/ghl-sync-conversations/index.ts` | Verificar `isSyncChannelAllowed` ANTES de criar conversa (mover check para cima) |
| `supabase/functions/ghl-webhook-contact/index.ts` | Implementar routing multi-workspace por canal (igual ao message webhook) |
| SQL migration (limpeza) | Remover conversas duplicadas do workspace errado |

## Critérios de Aceitação
- Conversas Instagram da Blecksen aparecem APENAS na Blecksen
- Conversas da Metodopare aparecem APENAS na Metodopare
- Um novo sync não recria conversas no workspace errado
- Webhooks em tempo real encaminham para o workspace correcto

## Riscos
- Se `workspace_ghl_social_channels` não estiver configurado para ambos os workspaces, o sistema não consegue distinguir — será necessário configurar antes de deploy
- A limpeza de dados existentes requer cuidado para não apagar mensagens legítimas

