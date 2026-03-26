

# Extrair Funcionalidades UI dos Componentes WhatsApp Enviados

## Análise: O que os ficheiros enviados têm que o projeto não tem

Os ficheiros enviados usam Socket.IO/Baileys (incompatível), mas têm UI features valiosas que faltam no projeto:

| Feature | Uploaded | Atual |
|---|---|---|
| Config Panel com 3 tabs (Autopilot, Mensagens, Definições) | ✅ Completo | ❌ Básico (só toggle + link) |
| Personalidade IA (textarea) | ✅ | ❌ |
| Welcome/Away messages | ✅ | ❌ |
| Notificações toggle | ✅ | ❌ |
| WhatsApp Inbox Page dedicada | ✅ | ❌ (usa inbox omnichannel) |
| Lead context panel no chat | ✅ | ✅ Já existe (InboxContextPanel) |
| Chat com status ticks (✓✓) | ✅ | ✅ Já existe (ConversationDetail) |

**Conclusão**: O inbox dedicado não faz sentido — o omnichannel existente é superior. O valor real está no **Config Panel expandido** e na **tabela de settings**.

## Plano

### 1. Nova tabela `whatsapp_settings`
Migração SQL para armazenar configurações por workspace:
- `autopilot_enabled`, `ai_persona`, `welcome_message`, `away_message`
- `business_hours_only`, `auto_create_leads`, `notify_on_new_message`
- RLS com `is_workspace_member` / `is_workspace_admin_or_owner`

### 2. Expandir `WhatsAppConfigPanel.tsx`
Manter a secção de conexão atual (Meta Cloud API) e adicionar tabs quando conectado:

**Tab "Auto-Piloto IA"**:
- Toggle Ativar/Desativar
- Textarea para personalidade da IA
- Toggle "Apenas em horário comercial"

**Tab "Mensagens Automáticas"**:
- Textarea para mensagem de boas-vindas
- Textarea para mensagem de ausência

**Tab "Definições"**:
- Toggle criar leads automaticamente (mover do nível atual)
- Toggle notificações de novas mensagens
- Botão "Guardar Definições"

### 3. Hook `useWhatsAppSettings`
CRUD para a tabela `whatsapp_settings` com upsert por workspace.

## Ficheiros afetados

| Ação | Ficheiro |
|---|---|
| Migração | Nova SQL (tabela `whatsapp_settings`) |
| Editado | `src/components/settings/WhatsAppConfigPanel.tsx` |
| Criado | `src/hooks/useWhatsAppSettings.ts` |

## O que NÃO será feito
- **WhatsApp Inbox Page dedicada** — o inbox omnichannel existente já suporta WhatsApp com context panel, IA, e atribuição
- **Componentes Socket.IO** — incompatíveis com a Cloud API
- **whatsapp_sessions table** — já existe `whatsapp_connections`

