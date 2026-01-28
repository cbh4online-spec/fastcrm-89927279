
# Plano: Integracao GoHighLevel (GHL) - V0 Token por Location + Webhooks

## Resumo Executivo

Implementar a integracao GHL V0 seguindo o modelo mais simples e rapido para colocar clientes a operar:
- **1 Workspace FastCRM = 1 Location GHL**
- Armazenamento seguro de credenciais GHL por workspace
- 2 Endpoints de webhook para receber contactos e mensagens
- Mapeamento e idempotencia para evitar duplicados

---

## Arquitetura da Solucao

```text
+------------------+       Webhooks         +----------------------+
|   GoHighLevel    |----------------------->|     FastCRM          |
|   (Location)     |  POST /ghl-webhook/*   |   Edge Functions     |
+------------------+                        +----------------------+
                                                     |
                                                     v
                                            +----------------------+
                                            |     Supabase         |
                                            |  - workspace_ghl_config  |
                                            |  - leads             |
                                            |  - contacts          |
                                            |  - conversations     |
                                            |  - messages          |
                                            +----------------------+
```

---

## Base de Dados

### Nova Tabela: `workspace_ghl_config`

Armazena as credenciais GHL por workspace (seguindo o padrao de `workspace_stripe_config`):

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| workspace_id | uuid | FK para workspaces (unique) |
| ghl_location_id | text | ID da location no GHL |
| ghl_api_key_encrypted | text | Token API encriptado |
| ghl_webhook_secret | text | Secret para validar webhooks (opcional) |
| is_active | boolean | Se a integracao esta ativa |
| last_sync_at | timestamp | Ultima sincronizacao bem sucedida |
| sync_contacts | boolean | Sincronizar contactos |
| sync_messages | boolean | Sincronizar mensagens |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

### Nova Tabela: `ghl_sync_log`

Para idempotencia e audit trail:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| workspace_id | uuid | FK para workspaces |
| ghl_entity_type | text | 'contact' ou 'message' |
| ghl_entity_id | text | ID original do GHL |
| fastcrm_entity_type | text | 'lead', 'contact', ou 'message' |
| fastcrm_entity_id | uuid | ID no FastCRM |
| event_type | text | 'created', 'updated' |
| payload | jsonb | Dados originais (para debug) |
| processed_at | timestamp | Data de processamento |

**Constraints de Idempotencia:**
- `UNIQUE (workspace_id, ghl_entity_type, ghl_entity_id)`

### Alteracoes em Tabelas Existentes

**leads:**
- Adicionar `ghl_contact_id` (text, nullable) - ID do contacto no GHL
- Adicionar `ghl_synced_at` (timestamp, nullable) - Ultima sync

**contacts:**
- Adicionar `ghl_contact_id` (text, nullable) - ID do contacto no GHL
- Adicionar `ghl_synced_at` (timestamp, nullable) - Ultima sync

**conversations:**
- Ja tem `external_thread_id` que pode ser usado para `ghl_{conversation_id}`

**messages:**
- Adicionar `ghl_message_id` (text, nullable) - ID da mensagem no GHL

---

## Edge Functions (Webhooks)

### 1. `ghl-webhook-contact` - Receber Contactos

**URL:** `POST /functions/v1/ghl-webhook-contact`

**Headers esperados:**
- `X-GHL-Location-Id`: ID da location
- `Content-Type`: application/json

**Payload esperado:**
```json
{
  "event_type": "contact_upsert",
  "location_id": "xxx",
  "contact": {
    "id": "ghl_contact_id",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+351912345678",
    "tags": ["tag1", "tag2"],
    "custom_fields": {},
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Logica:**
1. Extrair `location_id` do header ou body
2. Encontrar `workspace_id` via `workspace_ghl_config`
3. Verificar idempotencia via `ghl_sync_log`
4. Upsert em `leads` ou `contacts` baseado em email/phone
5. Registar em `ghl_sync_log`
6. Retornar 200 OK

### 2. `ghl-webhook-message` - Receber Mensagens

**URL:** `POST /functions/v1/ghl-webhook-message`

**Headers esperados:**
- `X-GHL-Location-Id`: ID da location
- `Content-Type`: application/json

**Payload esperado:**
```json
{
  "event_type": "message_upsert",
  "location_id": "xxx",
  "conversation_id": "ghl_conv_id",
  "message": {
    "id": "ghl_message_id",
    "contact_id": "ghl_contact_id",
    "direction": "inbound",
    "channel": "sms",
    "body": "Mensagem de texto",
    "status": "delivered",
    "sent_at": "2024-01-01T00:00:00Z"
  }
}
```

**Logica:**
1. Encontrar workspace via `location_id`
2. Verificar idempotencia (ja processamos esta mensagem?)
3. Encontrar ou criar conversation via `external_thread_id`
4. Encontrar lead/contact via `ghl_contact_id`
5. Criar mensagem em `messages`
6. Atualizar `last_message_at` na conversation
7. Registar em `ghl_sync_log`
8. Retornar 200 OK

---

## Frontend

### Hook: `useWorkspaceGHLConfig`

Seguindo o padrao de `useWorkspaceStripeConfig`:

```typescript
interface WorkspaceGHLConfig {
  id: string;
  workspace_id: string;
  ghl_location_id: string | null;
  ghl_api_key_encrypted: string | null;
  is_active: boolean;
  sync_contacts: boolean;
  sync_messages: boolean;
  last_sync_at: string | null;
}

function useWorkspaceGHLConfig() {
  // Query e mutations para CRUD da config
  return { config, saveConfig, testConnection, isConfigured };
}
```

### Componente: `WorkspaceGHLSettings`

Nova seccao em Definicoes > Integracoes:

**Campos:**
- Location ID (input texto)
- API Key (input password com toggle)
- Toggle: Sincronizar Contactos
- Toggle: Sincronizar Mensagens
- Toggle: Ativar Integracao
- Botao: Testar Conexao
- Botao: Guardar

**Info Box com URLs dos Webhooks:**
```
POST https://{supabase_url}/functions/v1/ghl-webhook-contact
POST https://{supabase_url}/functions/v1/ghl-webhook-message

Headers obrigatorios:
- X-GHL-Location-Id: {your_location_id}
- Content-Type: application/json
```

---

## Fluxo de Configuracao (Utilizador)

1. Utilizador vai a **Definicoes > Integracoes > GoHighLevel**
2. Insere o `Location ID` do GHL
3. Insere a `API Key` (token) do GHL
4. Ativa as sincronizacoes desejadas (Contactos, Mensagens)
5. Clica "Guardar"
6. Copia as URLs dos webhooks e cola no GHL
7. No GHL, configura os webhooks para disparar nos eventos de contacto/mensagem

---

## Consideracoes de Seguranca

1. **API Key encriptada** - Armazenada de forma segura, nunca exposta no frontend
2. **RLS policies** - Apenas membros do workspace podem ler/escrever config
3. **Rate limiting** - Implementar throttling nos webhooks
4. **Validacao de origem** - Verificar `X-GHL-Location-Id` corresponde ao config

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| **Migracao SQL** | CRIAR | Tabelas `workspace_ghl_config` e `ghl_sync_log` + colunas extras |
| `supabase/functions/ghl-webhook-contact/index.ts` | CRIAR | Webhook para contactos |
| `supabase/functions/ghl-webhook-message/index.ts` | CRIAR | Webhook para mensagens |
| `supabase/config.toml` | MODIFICAR | Adicionar funcoes com `verify_jwt = false` |
| `src/hooks/useWorkspaceGHLConfig.ts` | CRIAR | Hook para gerir config GHL |
| `src/components/settings/sections/WorkspaceGHLSettings.tsx` | CRIAR | UI de configuracao |
| `src/components/settings/sections/IntegrationsSettings.tsx` | MODIFICAR | Adicionar seccao GHL |

---

## Detalhes Tecnicos

### SQL Migration

```sql
-- Tabela de configuracao GHL por workspace
CREATE TABLE public.workspace_ghl_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ghl_location_id text,
  ghl_api_key_encrypted text,
  ghl_webhook_secret text,
  is_active boolean DEFAULT false,
  sync_contacts boolean DEFAULT true,
  sync_messages boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indice para lookup rapido por location
CREATE INDEX idx_workspace_ghl_config_location 
ON public.workspace_ghl_config(ghl_location_id);

-- RLS
ALTER TABLE public.workspace_ghl_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem ver config GHL do workspace"
ON public.workspace_ghl_config FOR SELECT
USING (workspace_id IN (SELECT get_user_workspace_ids()));

CREATE POLICY "Owners/Admins podem editar config GHL"
ON public.workspace_ghl_config FOR ALL
USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Tabela de log de sync para idempotencia
CREATE TABLE public.ghl_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  ghl_entity_type text NOT NULL,
  ghl_entity_id text NOT NULL,
  fastcrm_entity_type text NOT NULL,
  fastcrm_entity_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamp with time zone DEFAULT now(),
  UNIQUE (workspace_id, ghl_entity_type, ghl_entity_id)
);

CREATE INDEX idx_ghl_sync_log_lookup 
ON public.ghl_sync_log(workspace_id, ghl_entity_type, ghl_entity_id);

ALTER TABLE public.ghl_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.ghl_sync_log
FOR ALL USING (false);

-- Colunas extras nas tabelas existentes
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ghl_contact_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ghl_synced_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_leads_ghl_contact ON public.leads(workspace_id, ghl_contact_id);

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS ghl_contact_id text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS ghl_synced_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_contacts_ghl_contact ON public.contacts(workspace_id, ghl_contact_id);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ghl_message_id text;
CREATE INDEX IF NOT EXISTS idx_messages_ghl ON public.messages(workspace_id, ghl_message_id);
```

### Estrutura do Webhook Contact

```typescript
// supabase/functions/ghl-webhook-contact/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS + OPTIONS handling
  
  const body = await req.json();
  const locationId = req.headers.get("X-GHL-Location-Id") || body.location_id;
  
  // 1. Find workspace by location_id
  const { data: config } = await supabase
    .from("workspace_ghl_config")
    .select("workspace_id, sync_contacts")
    .eq("ghl_location_id", locationId)
    .eq("is_active", true)
    .single();
  
  if (!config || !config.sync_contacts) {
    return new Response("Not configured", { status: 200 });
  }
  
  // 2. Check idempotency
  const { data: existing } = await supabase
    .from("ghl_sync_log")
    .select("id")
    .eq("workspace_id", config.workspace_id)
    .eq("ghl_entity_type", "contact")
    .eq("ghl_entity_id", body.contact.id)
    .maybeSingle();
  
  if (existing) {
    // Already processed - update instead
    // ...
  }
  
  // 3. Upsert lead/contact
  // 4. Log sync
  // 5. Return 200
});
```

---

## Proximos Passos (V1 - OAuth)

Quando estavel e a vender:
1. Registar app no GHL Marketplace
2. Implementar fluxo OAuth
3. Trocar token storage por refresh tokens
4. Manter compatibilidade com V0

---

## Estimativa de Tempo

| Componente | Estimativa |
|------------|------------|
| Database migration | 15 min |
| Webhook contact | 45 min |
| Webhook message | 45 min |
| Hook useWorkspaceGHLConfig | 30 min |
| UI WorkspaceGHLSettings | 45 min |
| Integracao em Settings | 15 min |
| **Total** | ~3h |
