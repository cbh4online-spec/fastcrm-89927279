

# Adaptação WhatsApp — Auto-Lead, Autopilot e Painel de Configuração

## Diagnóstico
A infraestrutura WhatsApp Cloud API está completa (webhook, envio, OAuth, normalize-message). O inbox UI já suporta WhatsApp nativamente. Faltam 3 peças:

1. **Auto-criação de leads** — o `whatsapp-webhook` cria conversas mas não leads
2. **Autopilot IA** — existe no GHL (`ghl-webhook-message`) mas não no WhatsApp
3. **Painel de configuração** — não existe UI para gerir a conexão WhatsApp

## Plano

### 1. Auto-criação de leads no webhook WhatsApp
**Ficheiro**: `supabase/functions/whatsapp-webhook/index.ts`

Após `normalizeIncomingMessage`, quando `is_new_conversation === true`:
- Procurar lead existente pelo phone (`sender_id`)
- Se não existir → criar lead com `name: "WhatsApp +{phone}"`, `phone`, `source: "whatsapp"`, `status: "new"`
- Associar a conversa ao `lead_id` criado (update conversation)
- Se existir → associar conversa ao lead existente

Respeitará um flag `auto_create_leads` na `whatsapp_connections` (default: true).

### 2. Autopilot trigger no webhook WhatsApp
**Ficheiro**: `supabase/functions/whatsapp-webhook/index.ts`

Replicar o padrão `triggerAutopilotResponse` do `ghl-webhook-message`:
- Verificar `ai_agents` (canal `whatsapp`, `autopilot_enabled`) → fallback para `autopilot_config`
- Verificar horário de funcionamento, limites de mensagens, dedup
- Chamar `ai-inbox-reply` com delay configurado
- Enviar resposta via `whatsapp-send-message`
- Registar em `autopilot_events`

A lógica será extraída para `_shared/whatsapp-autopilot.ts` para reutilização.

### 3. Migração DB — nova coluna
**SQL Migration**:
```sql
ALTER TABLE whatsapp_connections
  ADD COLUMN IF NOT EXISTS auto_create_leads BOOLEAN DEFAULT true;
```

### 4. Painel de Configuração WhatsApp (UI)
**Criado**: `src/components/settings/WhatsAppConfigPanel.tsx`

Card com:
- **Estado da conexão**: número conectado, status ativo/inativo, expiração do token
- **Botão Conectar** (chama `whatsapp-auth-url`) / **Desconectar**
- **Toggle "Criar leads automaticamente"** → atualiza `auto_create_leads`
- **Toggle "Autopilot ativo"** → link rápido para configuração do AI Agent
- **Número de telefone** e WABA ID (read-only)

**Integrado em**: página de Settings/Integrações existente

## Ficheiros afetados
| Ação | Ficheiro |
|---|---|
| Migração | Nova migração SQL (coluna `auto_create_leads`) |
| Editado | `supabase/functions/whatsapp-webhook/index.ts` |
| Criado | `supabase/functions/_shared/whatsapp-autopilot.ts` |
| Criado | `src/components/settings/WhatsAppConfigPanel.tsx` |
| Criado | `src/hooks/useWhatsAppConfig.ts` |
| Editado | Página de Settings (integrar painel) |

