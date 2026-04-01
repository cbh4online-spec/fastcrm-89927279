

# Plano: MCP-Aware Page/Funnel Generation

## Estado Actual

- **MCP Provider Registry**: Completo (CRUD, test, health, bindings)
- **MCP Import Pipeline**: Completo (import, normalização Figma, histórico)
- **Landing Pages**: Tabela `landing_pages` com campos simples (title, slug, headline, subheadline, cta_text, features, testimonials, form_fields, custom_css). Hook `useCreateLandingPage` insere directamente.
- **Funnels**: Tabela `funnels` + `funnel_steps` (step_type, content jsonb). Hook `useCreateFunnel` cria funil + 5 steps default.
- **Normalized Payload**: Já tem `sections[]` (com section_type, content_placeholders, media_slots, cta_slots, form_slots, token_references, layout), `tokens`, `components`, `metadata`.

## Arquitectura da Geração

```text
┌──────────────────────────────────┐
│  UI: MCPGenerateDialog           │
│  1. Escolher import concluído    │
│  2. Escolher target (LP/Funnel)  │
│  3. Preview secções + confirmar  │
│  4. Gerar → abre editor          │
├──────────────────────────────────┤
│  Edge Function: generate_page    │
│  / generate_funnel actions       │
│  - Carrega import normalizado    │
│  - Mapeia secções → LP fields    │
│    ou → funnel_steps             │
│  - Aplica tokens como custom_css │
│  - Persiste via service_role     │
│  - Retorna ID do asset criado    │
├──────────────────────────────────┤
│  DB: landing_pages / funnels     │
│  (tabelas existentes)            │
└──────────────────────────────────┘
```

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| `supabase/functions/marketing-mcp/index.ts` | EDITAR — adicionar actions `generate_page` e `generate_funnel` |
| `src/hooks/useMarketingMCP.ts` | EDITAR — adicionar `useGeneratePageFromMCP()` e `useGenerateFunnelFromMCP()` |
| `src/components/marketing/mcp/MCPGenerateDialog.tsx` | CRIAR — dialog de geração com preview |
| `src/components/marketing/mcp/MCPImportHistory.tsx` | EDITAR — adicionar botão "Gerar" nos imports concluídos |
| `src/components/landing-pages/LandingPagesList.tsx` | EDITAR — adicionar botão "Gerar a partir de MCP" |
| `src/components/funnels/FunnelsList.tsx` | EDITAR — adicionar botão "Gerar a partir de MCP" |

## Detalhes Técnicos

### 1. Edge Function — `generate_page` action

Recebe: `{ workspace_id, import_id, title?, slug? }`

Lógica:
1. Carregar import normalizado do DB (validar status=completed, workspace)
2. Extrair secções, tokens do `normalized_payload_json`
3. Mapear para campos `landing_pages`:
   - `headline` ← primeiro content_placeholder da secção `hero`
   - `subheadline` ← segundo content_placeholder ou secção `benefits`
   - `cta_text` ← primeiro cta_slot do `hero` ou `cta`
   - `features` ← secções `benefits`/`content` mapeadas como array JSON
   - `testimonials` ← secções `social_proof` mapeadas
   - `form_enabled` ← true se existir secção `form`
   - `form_fields` ← form_slots da secção `form`
   - `custom_css` ← CSS gerado a partir dos tokens (cores, tipografia)
4. INSERT em `landing_pages`, retornar ID
5. Logs estruturados

### 2. Edge Function — `generate_funnel` action

Recebe: `{ workspace_id, import_id, name?, slug? }`

Lógica:
1. Carregar import normalizado
2. Mapear secções para `funnel_steps`:
   - hero → step_type "page" (sort_order 0)
   - form/opt-in → step_type "optin"
   - social_proof/benefits → step_type "testimonials"
   - thank_you → step_type "thankyou"
   - upsell → step_type "upsell"
   - outros → step_type "page"
3. Cada step recebe `content` jsonb com dados da secção normalizada (placeholders, slots, tokens)
4. INSERT funnel + steps, retornar ID
5. Logs estruturados

### 3. Hooks — Novos mutations

```typescript
useGeneratePageFromMCP()   // mutation → action: generate_page
useGenerateFunnelFromMCP() // mutation → action: generate_funnel
```

Ambos invalidam queries de landing-pages/funnels e retornam o ID do asset criado.

### 4. UI — MCPGenerateDialog

Dialog com 3 passos:

**Passo 1**: Escolher import (dropdown dos completed) — mostra secções/tokens do import seleccionado
**Passo 2**: Escolher target — Landing Page ou Funil. Campos: título, slug (auto-gerado)
**Passo 3**: Preview — resumo das secções que serão mapeadas, tokens aplicados. Botão "Gerar"

Após geração bem-sucedida: toast + opção de navegar para o editor (LandingPageBuilder ou FunnelBuilder).

### 5. Entry Points

- **MCPImportHistory**: Botão "Gerar Página" / "Gerar Funil" em cada import com status `completed`
- **LandingPagesList**: Botão extra "Gerar a partir de MCP" no header, junto ao "Criar"
- **FunnelsList**: Botão extra "Gerar a partir de MCP" no header

### 6. Section-to-Step Mapping Table

| Section Type | Landing Page Field | Funnel Step Type |
|---|---|---|
| hero | headline, subheadline, cta_text, hero_image_url | page (sort 0) |
| benefits | features[] | page |
| social_proof | testimonials[] | testimonials |
| form | form_enabled, form_fields | optin |
| cta | cta_text | page |
| faq | features[] (appended) | page |
| pricing | features[] (appended) | page |
| thank_you | — | thankyou |
| upsell | — | upsell |
| content | features[] (appended) | page |
| footer | custom_css (footer rules) | — |

### 7. Observabilidade

Logs: `marketing_mcp_generation_started`, `marketing_mcp_page_generated`, `marketing_mcp_funnel_generated`, `marketing_mcp_generation_failed`. Cada um com workspace_id, import_id, target_type, asset_id.

## Critérios de Aceitação

1. Utilizador pode gerar landing page a partir de import MCP concluído
2. Utilizador pode gerar funil a partir de import MCP concluído
3. Secções normalizadas são mapeadas correctamente para campos LP / funnel steps
4. Tokens são aplicados como custom_css na landing page
5. Assets gerados são editáveis nos builders existentes
6. Entry points visíveis em LandingPagesList, FunnelsList e Import History
7. Dialog de geração mostra preview das secções antes de confirmar
8. Logs estruturados em todas as operações de geração

