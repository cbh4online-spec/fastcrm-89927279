

# Plano: Figma MCP Adapter + Import/Normalization Pipeline

## Estado Actual

- **Existe**: Provider registry (DB + edge function + UI) com CRUD, test, health check, workflow bindings
- **Não existe**: tabela `marketing_mcp_imports`, actions de import no edge function, normalização, UI de importação

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migration SQL | CRIAR — tabela `marketing_mcp_imports` + RLS + indexes |
| `supabase/functions/marketing-mcp/index.ts` | EDITAR — adicionar actions: `import_context`, `list_imports`, `get_import` |
| `src/hooks/useMarketingMCP.ts` | EDITAR — adicionar hooks de import |
| `src/components/marketing/mcp/MCPImportDialog.tsx` | CRIAR — wizard de importação |
| `src/components/marketing/mcp/MCPImportHistory.tsx` | CRIAR — lista de imports anteriores |
| `src/components/marketing/mcp/MCPImportResult.tsx` | CRIAR — visualização do resultado normalizado |
| `src/components/marketing/mcp/MCPIntegrationsTab.tsx` | EDITAR — adicionar secção de imports |

## 1. Migration — `marketing_mcp_imports`

```sql
CREATE TABLE public.marketing_mcp_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.marketing_mcp_providers(id) ON DELETE CASCADE,
  import_type text NOT NULL,  -- 'design_system','page_frame','section','component','tokens'
  external_reference_id text,
  external_reference_name text,
  status text NOT NULL DEFAULT 'pending',  -- 'pending','processing','completed','failed'
  imported_payload_json jsonb DEFAULT '{}',
  normalized_payload_json jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Indexes: `workspace_id`, `provider_id`, `import_type`, `created_at DESC`. RLS escopado por workspace_members. Trigger `updated_at`.

## 2. Edge Function — Figma MCP Adapter + Normalization

Adicionar 3 actions à edge function existente:

### `import_context`
1. Valida `provider_id`, `import_type`, `external_reference` (ex: Figma file key ou node ID)
2. Busca provider do DB, extrai credenciais
3. Cria registo de import com status `processing`
4. Chama o MCP server com `tools/call` (JSON-RPC) — tool name depende do import_type:
   - `design_system` → `get_file` (ficheiro completo com design tokens)
   - `page_frame` → `get_file_nodes` (nós específicos por node ID)
   - `section` → `get_file_nodes` 
   - `tokens` → `get_team_styles` ou `get_file_styles`
5. Normaliza a resposta raw em estrutura marketing:

**Normalization target**:
```json
{
  "source": { "provider_key": "figma", "file_key": "...", "node_id": "..." },
  "sections": [
    {
      "section_type": "hero",
      "section_name": "Hero Principal",
      "order": 0,
      "layout": { "direction": "vertical", "alignment": "center" },
      "content_placeholders": ["headline", "subheadline", "cta_text"],
      "media_slots": ["hero_image"],
      "cta_slots": ["primary_cta"],
      "responsive_hints": { "mobile_stack": true },
      "token_references": { "bg_color": "#1a1a2e", "text_color": "#ffffff" }
    }
  ],
  "tokens": { "colors": {...}, "typography": {...}, "spacing": {...} },
  "components": [{ "name": "...", "variants": [...] }],
  "metadata": { "page_count": 1, "section_count": 5, "total_nodes": 42 }
}
```

A normalização classifica frames/nós por nome e hierarquia:
- Nomes contendo hero/banner → `hero`
- Nomes contendo cta/button/action → `cta`
- Nomes contendo faq/questions → `faq`
- Nomes contendo pricing/price/plans → `pricing`
- Nomes contendo testimonial/proof/review → `social_proof`
- Nomes contendo footer → `footer`
- Nomes contendo form/opt-in/signup → `form`
- Default → `content`

6. Persiste raw + normalized no DB, actualiza status para `completed` ou `failed`

### `list_imports`
SELECT imports por workspace, com join ao provider para mostrar nome. Ordenado por `created_at DESC`. Limit 50.

### `get_import`
SELECT single import por ID + workspace validation.

## 3. Hooks — Novos

```typescript
useMCPImports(workspaceId) // lista
useMCPImport(importId)     // detalhe
useImportFromMCP()         // mutation: import_context
```

## 4. UI — Import Dialog (Wizard de 3 passos)

**Passo 1 — Configuração**: Seleccionar provider (dropdown dos activos) + import type (design_system, page_frame, section, tokens) + referência externa (input texto: file key ou URL Figma)

**Passo 2 — A processar**: Loader com status do import

**Passo 3 — Resultado**: Sumário com secções detectadas, tokens, componentes. Badge de status. Acção "Usar em Landing Page" / "Usar em Funil" (futuro).

## 5. UI — Import History

Tabela com: data, provider, tipo, referência, status, acção "Ver Detalhes". Dentro de `MCPIntegrationsTab`, abaixo de Workflow Bindings.

## 6. UI — Import Result

Card expandível mostrando: secções normalizadas (tipo + nome + ordem), tokens detectados, contagem de componentes, raw payload colapsável para debug.

## Segurança

- Import corre via service_role no edge function
- RLS por workspace_members em todas as queries
- Credenciais MCP nunca expostas ao frontend
- Input validado (import_type enum, referência max 500 chars)
- Logs estruturados para cada fase

## Critérios de Aceitação

1. Tabela `marketing_mcp_imports` criada com RLS
2. Edge function suporta `import_context`, `list_imports`, `get_import`
3. Figma MCP adapter faz JSON-RPC `tools/call` ao servidor MCP configurado
4. Raw payload persistido + normalizado em secções/tokens/componentes marketing
5. UI permite seleccionar provider, tipo, referência e executar import
6. Histórico de imports visível com status e detalhes
7. Resultado normalizado mostra secções classificadas por tipo marketing
8. Arquitectura extensível (adapter pattern — Figma é o primeiro, lógica genérica)

