

# Plano: MCP Integration Layer para Marketing Module

## Diagnóstico

O Marketing module actual tem tabs (Dashboard, Campanhas, Segmentos, Templates, Landing Pages, Multi-Canal, Automações, Analytics, Eventos, Pipeline, Definições). Já existe um AI Funnel Builder, Landing Page Builder, e Template Library. Não existe qualquer infra de MCP. O Figma MCP não está nos conectores nativos do Lovable — terá de ser implementado como provider custom via Edge Functions.

## Decisões de Produto

- MCP Providers são configurações geridas pelo workspace admin dentro de Marketing > Definições
- Figma MCP é o primeiro adapter — ligação via Server URL + token
- A arquitectura é extensível para futuros providers (Git, CMS, etc.)
- O contexto MCP importado é normalizado em "Marketing Blocks" reutilizáveis
- A geração de páginas/funis pode usar MCP context como input adicional ao AI builder existente

## Arquitectura

```text
┌─────────────────────────────────────┐
│  Marketing UI (Tab: Integrações MCP)│
│  ├── Provider List + CRUD          │
│  ├── Connection Test / Health      │
│  ├── Workflow Bindings             │
│  └── Import Browser                │
├─────────────────────────────────────┤
│  Hook: useMarketingMCP()           │
│  ├── providers CRUD (react-query)  │
│  ├── test/health mutations         │
│  └── import mutation               │
├─────────────────────────────────────┤
│  Edge Function: marketing-mcp      │
│  ├── /providers — CRUD             │
│  ├── /test — connection test       │
│  ├── /health — health check        │
│  ├── /import — fetch + normalize   │
│  └── /generate — MCP-aware gen     │
├─────────────────────────────────────┤
│  DB Tables                         │
│  ├── marketing_mcp_providers       │
│  ├── marketing_mcp_workflow_binds  │
│  └── marketing_mcp_imports         │
└─────────────────────────────────────┘
```

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migration SQL | CRIAR — 3 tabelas + RLS |
| `supabase/functions/marketing-mcp/index.ts` | CRIAR — edge function multi-action |
| `src/hooks/useMarketingMCP.ts` | CRIAR — hook com queries + mutations |
| `src/components/marketing/mcp/MCPProvidersPanel.tsx` | CRIAR — lista + CRUD de providers |
| `src/components/marketing/mcp/MCPProviderDialog.tsx` | CRIAR — dialog criar/editar provider |
| `src/components/marketing/mcp/MCPWorkflowBindings.tsx` | CRIAR — bindings workflow → provider |
| `src/components/marketing/mcp/MCPImportBrowser.tsx` | CRIAR — browser de imports MCP |
| `src/components/marketing/mcp/MCPIntegrationsTab.tsx` | CRIAR — tab container |
| `src/pages/Marketing.tsx` | EDITAR — adicionar tab "Integrações MCP" |

## Detalhes Técnicos

### 1. Migration SQL — 3 tabelas

**marketing_mcp_providers**: id, workspace_id, provider_key (figma, git, etc.), provider_name, provider_type, server_url, auth_type (bearer, api_key, oauth), is_enabled, is_default_for_pages, is_default_for_funnels, connection_status (unknown, connected, error), last_health_check_at, last_error, metadata_json (jsonb), created_at, updated_at.

**marketing_mcp_workflow_bindings**: id, workspace_id, workflow_type (landing_page, funnel, campaign, template, section_library), provider_id FK, config_json, created_at, updated_at. UNIQUE(workspace_id, workflow_type).

**marketing_mcp_imports**: id, workspace_id, provider_id FK, import_type (design_system, page_frame, section, component, tokens), external_reference_id, external_reference_name, status (pending, processing, completed, failed), imported_payload_json, normalized_payload_json, created_at, updated_at.

RLS: todas as tabelas escopadas por workspace_id via workspace_members.

### 2. Edge Function: `marketing-mcp`

Endpoint unificado com `action` no body:

- **list_providers** — SELECT por workspace
- **create_provider** — INSERT com validação zod
- **update_provider** — UPDATE
- **delete_provider** — soft disable
- **test_connection** — faz HTTP request ao server_url do provider (MCP initialize/list_tools), retorna resultado
- **health_check** — igual a test mas persiste resultado no DB
- **import_context** — chama MCP server, busca contexto (ex: Figma frames), normaliza em blocos marketing, persiste em marketing_mcp_imports
- **list_imports** — SELECT imports do workspace
- **generate_from_mcp** — usa import normalizado como context para AI (via ai-router) gerar HTML/structure de página/funnel

Para Figma MCP adapter:
- Chama o servidor MCP Figma via HTTP (Streamable HTTP transport)
- Headers: `Accept: application/json, text/event-stream`, `Content-Type: application/json`
- Usa tools como `get_file`, `get_file_nodes`, `get_team_styles` se disponíveis
- Normaliza resposta em blocos: sections, tokens, layout hierarchy

Auth: JWT + workspace_members validation. CORS headers manuais (padrão do projecto).

### 3. Hook: `useMarketingMCP`

- `useMarketingMCPProviders(workspaceId)` — react-query GET
- `useCreateMCPProvider()` — mutation
- `useUpdateMCPProvider()` — mutation
- `useTestMCPConnection()` — mutation
- `useHealthCheckMCP()` — mutation
- `useImportFromMCP()` — mutation
- `useMarketingMCPImports(workspaceId)` — react-query GET

### 4. UI — Tab "Integrações MCP" no Marketing

Nova tab no Marketing.tsx com ícone `Blocks`:

**MCPProvidersPanel**: tabela de providers com status badges, botões Test/Enable/Disable/Edit/Delete. Card de "Adicionar Provider" com presets (Figma, Custom MCP).

**MCPProviderDialog**: formulário com campos: nome, tipo (select: figma, git, custom), server URL, auth type, credentials (token field masked). Botão "Testar Conexão" inline.

**MCPWorkflowBindings**: cards por workflow type (Landing Pages, Funis, Templates, Secções) com dropdown de provider assignado.

**MCPImportBrowser**: lista de imports anteriores com status. Botão "Nova Importação" que abre wizard: escolher provider → inserir referência (ex: Figma file URL) → import → ver resultado normalizado.

### 5. Integração com Builders Existentes

No `LandingPageBuilder` e `AIFunnelBuilder`, adicionar opção "Usar contexto MCP" que:
- Lista imports normalizados disponíveis
- Permite seleccionar um como base/referência
- Passa como context ao prompt de geração AI

Isto é uma extensão futura — nesta fase, a infra de import e normalização fica pronta, e a tab MCP fica operacional.

### 6. Segurança

- Credenciais MCP encriptadas no campo metadata_json (não em plaintext — na edge function, usar `pgcrypto` ou armazenar via secrets quando possível)
- RLS em todas as tabelas por workspace_id
- Edge function valida JWT + workspace membership
- Inputs validados com zod

## Critérios de Aceitação

1. DB tem 3 tabelas com RLS por workspace
2. Admin pode criar/editar/eliminar MCP providers
3. Admin pode testar conexão ao servidor MCP
4. Admin pode atribuir providers a workflows (landing pages, funis, etc.)
5. Sistema pode importar contexto de um MCP server (Figma como primeiro)
6. Imports são normalizados em blocos marketing reutilizáveis
7. Tab "Integrações MCP" visível e funcional no Marketing
8. Arquitectura extensível para novos providers
9. Logs estruturados em todas as operações MCP

