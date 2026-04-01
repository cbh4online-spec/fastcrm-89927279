

# Plano: MCP Provider Registry & Settings — Marketing Module

## Diagnóstico

- O build error actual é transiente (429 rate-limiting no npm cache) — não é problema de código. O `@fullcalendar/core` já está no package.json. O build deve passar ao re-tentar.
- Já existe `figma-extract` edge function que usa Figma REST API directamente — será reutilizado como referência.
- Não existe qualquer tabela `marketing_mcp_*` nem componentes MCP no frontend.
- O padrão do projecto usa `useWorkspace()` para scoping, `corsHeaders` manuais, e edge functions multi-action.

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migration SQL | CRIAR — 2 tabelas + RLS + indexes |
| `supabase/functions/marketing-mcp/index.ts` | CRIAR — edge function multi-action (CRUD, test, health) |
| `src/hooks/useMarketingMCP.ts` | CRIAR — queries + mutations |
| `src/components/marketing/mcp/MCPProvidersPanel.tsx` | CRIAR — lista de providers |
| `src/components/marketing/mcp/MCPProviderDialog.tsx` | CRIAR — dialog criar/editar |
| `src/components/marketing/mcp/MCPWorkflowBindings.tsx` | CRIAR — bindings UI |
| `src/components/marketing/mcp/MCPIntegrationsTab.tsx` | CRIAR — tab container |
| `src/pages/Marketing.tsx` | EDITAR — adicionar tab "Integrações MCP" |
| `supabase/config.toml` | EDITAR — adicionar `[functions.marketing-mcp]` |

## 1. Migration SQL

### Tabela `marketing_mcp_providers`
```sql
CREATE TABLE public.marketing_mcp_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_key text NOT NULL,           -- 'figma', 'git', 'custom'
  provider_name text NOT NULL,
  provider_type text NOT NULL DEFAULT 'mcp',
  server_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'bearer', -- 'bearer', 'api_key', 'none'
  encrypted_credentials_json jsonb DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  is_default_for_pages boolean NOT NULL DEFAULT false,
  is_default_for_funnels boolean NOT NULL DEFAULT false,
  connection_status text NOT NULL DEFAULT 'unknown', -- 'unknown','connected','error'
  last_health_check_at timestamptz,
  last_error text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider_key)
);
```

### Tabela `marketing_mcp_workflow_bindings`
```sql
CREATE TABLE public.marketing_mcp_workflow_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_type text NOT NULL,          -- 'landing_page','funnel','website','campaign','section_library'
  provider_id uuid NOT NULL REFERENCES public.marketing_mcp_providers(id) ON DELETE CASCADE,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, workflow_type)
);
```

Indexes em `workspace_id`, `provider_key`, `is_enabled`. RLS escopado por `workspace_id` via `workspace_members`. Trigger `updated_at`.

## 2. Edge Function: `marketing-mcp`

Endpoint unificado com campo `action` no body JSON:

| Action | Descrição |
|---|---|
| `list_providers` | SELECT providers por workspace |
| `create_provider` | INSERT com validação zod |
| `update_provider` | UPDATE parcial |
| `delete_provider` | DELETE |
| `test_connection` | HTTP request ao server_url (MCP initialize handshake) |
| `health_check` | Igual a test + persiste resultado no DB |
| `enable_provider` / `disable_provider` | Toggle is_enabled |
| `list_bindings` | SELECT bindings por workspace |
| `upsert_binding` | UPSERT binding workflow→provider |
| `delete_binding` | DELETE binding |

Segurança: JWT validation via `getClaims()` + workspace_members check + super admin bypass. CORS manual. Inputs validados com zod. Credenciais nunca retornadas ao frontend (campo redactado).

Test de conexão MCP: POST ao `server_url` com `{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"FastCRM","version":"1.0.0"}},"id":1}` com headers `Accept: application/json, text/event-stream` e `Content-Type: application/json`.

## 3. Hook: `useMarketingMCP`

- `useMCPProviders()` — react-query lista
- `useCreateMCPProvider()` — mutation
- `useUpdateMCPProvider()` — mutation
- `useDeleteMCPProvider()` — mutation
- `useTestMCPConnection()` — mutation
- `useHealthCheckMCP()` — mutation
- `useToggleMCPProvider()` — mutation enable/disable
- `useMCPWorkflowBindings()` — react-query lista
- `useUpsertMCPBinding()` — mutation

Todas chamam `supabase.functions.invoke('marketing-mcp', { body: { action, ... } })`.

## 4. UI — Tab "Integrações MCP"

Nova tab no Marketing.tsx com ícone `Blocks`:

### MCPProvidersPanel
- Tabela com colunas: Nome, Tipo, Estado, Activo, Default (Pages/Funnels), Último check, Acções
- Badges de status: `connected` (verde), `error` (vermelho), `unknown` (cinza)
- Botões: Testar, Editar, Activar/Desactivar, Eliminar
- Card "Adicionar Provider" com presets: Figma MCP, Custom MCP

### MCPProviderDialog
- Campos: nome, tipo (select: figma, git, custom), server URL, auth type (bearer, api_key, none), token (masked input)
- Toggles: default para pages, default para funnels
- Botão "Testar Conexão" inline com feedback
- Save/Update

### MCPWorkflowBindings
- Cards por workflow type com dropdown de provider
- Tipos: Landing Pages, Funis, Websites, Campanhas, Secções

## 5. Segurança

- Credenciais armazenadas em `encrypted_credentials_json` — nunca retornadas ao frontend
- Edge function redacta o campo antes de responder
- RLS por workspace_id
- JWT + workspace membership obrigatório
- Super admin bypass

## 6. Observabilidade

Logs estruturados `console.log(JSON.stringify({ event, workspace_id, provider_id, ... }))` para todos os eventos listados nos requisitos.

## Critérios de Aceitação

1. DB tem 2 tabelas com RLS por workspace
2. Admin pode CRUD MCP providers
3. Admin pode testar conexão ao servidor MCP
4. Admin pode activar/desactivar providers
5. Admin pode definir defaults para pages/funnels
6. Workflow bindings configuráveis
7. Credenciais nunca expostas ao frontend
8. Tab "Integrações MCP" visível no Marketing
9. Arquitectura extensível (provider_key genérico)
10. Build error resolvido (re-install deps)

