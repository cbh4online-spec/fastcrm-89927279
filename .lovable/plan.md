

## Adicionar Twilio como canal SMS adicional

### Estado actual

- O SMS actualmente é enviado **apenas via GHL** (`ghl-send-message`)
- O botão SMS no Inbox abre `QuickGHLChannelDialog` e exige configuração GHL activa
- Não existe nenhuma edge function, conector, card de integração nem tabela dedicada ao Twilio
- O Twilio aparece apenas como referência decorativa na landing page e no mapeamento de tipos GHL

### O que falta implementar

**1. Conectar Twilio via conector Lovable**
- Usar `standard_connectors--connect` com `connector_id: twilio`
- O conector disponibiliza `TWILIO_API_KEY` + `LOVABLE_API_KEY` para gateway
- Envio via gateway: `https://connector-gateway.lovable.dev/twilio/Messages.json`

**2. Edge function `twilio-send-sms`**
- Recebe: `workspaceId`, `conversationId`, `to` (E.164), `message`
- Valida JWT + workspace membership
- Busca o número Twilio `From` da configuração do workspace (nova coluna ou tabela `twilio_connections`)
- Envia via connector gateway com `application/x-www-form-urlencoded`
- Retorna SID da mensagem

**3. Edge function `twilio-webhook` (inbound SMS)**
- Recebe webhooks do Twilio (POST com `From`, `To`, `Body`, `MessageSid`)
- Valida assinatura Twilio (X-Twilio-Signature)
- Mapeia para `conversations` + `messages` com `channel = 'sms'` e `source = 'twilio'`
- Trigger do `trg_update_last_message_metadata` já cobre a actualização da conversa

**4. Tabela `twilio_connections`**
- `id`, `workspace_id`, `twilio_phone_number`, `is_active`, `created_at`, `updated_at`
- RLS escopado por workspace_id
- Armazena o número From configurado por workspace

**5. Card de integração `TwilioConnectionCard`**
- Semelhante ao `WhatsAppConnectionCard` e `InstagramConnectionCard`
- Mostra estado: desligado / ligado (número activo)
- Permite configurar o número Twilio From
- Aparece na página de integrações

**6. Actualizar fluxo de envio SMS no Inbox**
- `ComposeButton`: detectar se workspace tem Twilio activo
- Se Twilio activo: SMS usa `twilio-send-sms` em vez de `ghl-send-message`
- Se apenas GHL activo: manter comportamento actual
- `useMessages`: mesma lógica — se conversa tem `source = 'twilio'`, enviar via Twilio

**7. Actualizar `QuickGHLChannelDialog` ou criar `QuickTwilioSMSDialog`**
- Diálogo dedicado para SMS via Twilio (sem dependência de GHL config)
- Input: número destino + mensagem
- Cria lead/conversa e envia via `twilio-send-sms`

### Estrutura técnica

```text
Ficheiros novos:
  supabase/functions/twilio-send-sms/index.ts
  supabase/functions/twilio-webhook/index.ts
  src/components/integrations/TwilioConnectionCard.tsx
  src/components/inbox/QuickTwilioSMSDialog.tsx
  src/hooks/useTwilioConnection.ts

Ficheiros alterados:
  src/components/inbox/ComposeButton.tsx  (detectar Twilio vs GHL)
  src/hooks/useMessages.ts               (routing de envio)
  src/pages/settings/IntegrationsPage.tsx (adicionar card)
```

### Migração de dados
- Nova tabela `twilio_connections` com RLS
- Sem migração de dados existentes — canais GHL continuam a funcionar

### Critérios de aceitação
- Workspace pode configurar número Twilio no card de integrações
- SMS enviado via Twilio aparece na timeline da conversa
- SMS recebido via webhook Twilio cria/actualiza conversa no Inbox
- GHL continua a funcionar em paralelo para workspaces sem Twilio
- Edge functions validam JWT + workspace membership
- Inputs validados com zod

### Riscos
- Twilio requer número verificado — o utilizador precisa de ter uma conta Twilio activa com número
- Webhook Twilio precisa de URL pública — o endpoint edge function já é público
- Validação de assinatura Twilio requer o Auth Token como secret adicional (além do conector)

