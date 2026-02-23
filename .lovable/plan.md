

# Edge Function: product-ai-improve

## Resumo

Criar a Edge Function `product-ai-improve` que recebe um `product_id`, busca os dados do produto na DB, gera conteudo melhorado via Lovable AI (descripcoes, bullets, tags, SEO snippet), e opcionalmente grava os resultados de volta no produto e enfileira embeddings.

O `MQPCStepExtras` sera atualizado para chamar esta nova function em vez da `ai-product-assistant` com mode `generate-description`.

## Alteracoes

### 1. Nova Edge Function: `supabase/functions/product-ai-improve/index.ts`

**Fluxo completo:**

1. CORS preflight
2. Validar JWT e extrair `userId`
3. Ler `X-Workspace-Id` (obrigatorio)
4. Validar workspace membership (owner, admin, agent)
5. Parse body: `product_id`, `goals`, `generate`, `inputs_override`, `options`
6. Validar `product_id` obrigatorio
7. Buscar produto da DB via `adminClient.from("products").select(...)` com `workspace_id` e `product_id` -- se nao encontrado, retornar FORBIDDEN
8. Construir prompt de IA com dados do produto (name, category, short_description, commercial_description, sku, price) + `inputs_override` + `goals`
9. Chamar Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling para extrair output estruturado:
   - `short_description` (se `generate.short_description`)
   - `long_description` (se `generate.long_description`)
   - `bullets` (se `generate.bullets`)
   - `tags` (se `generate.tags`)
   - `seo_snippet` (se `generate.seo_snippet`)
10. Se `options.write_back = true`, atualizar produto na DB:
    - `short_description` <- `generated.short_description`
    - `commercial_description` <- `generated.long_description`
    - `search_keywords` <- `generated.tags.join(", ")`
11. Se `options.create_embeddings = true`, chamar `supabase.functions.invoke("product-embedding", { body: { productId } })` (fire-and-forget)
12. Criar audit log em `crm_activities` com event `product_ai_improved`
13. Retornar resposta estruturada

**Validacoes:**
- `product_id`: uuid, obrigatorio
- `goals.tone`: string, default "profissional"
- `goals.language`: string, default "pt-PT"
- `goals.max_length.short_description`: number, default 180
- `goals.max_length.seo_snippet`: number, default 160
- `generate`: objeto com booleans, pelo menos um deve ser true

**Respostas de erro:**
- 401 UNAUTHORIZED: JWT invalido
- 403 FORBIDDEN: nao membro do workspace ou produto nao pertence ao workspace
- 400 VALIDATION_ERROR: body invalido
- 502 AI_PROVIDER_ERROR: falha na chamada ao Lovable AI Gateway (429/402/5xx)
- 500 INTERNAL_ERROR: erro generico

**Resposta 200 (sucesso):**
```text
{
  "success": true,
  "data": {
    "product_id": "uuid",
    "generated": {
      "short_description": "...",
      "long_description": "...",
      "bullets": ["...", "..."],
      "tags": ["...", "..."],
      "seo_snippet": "..."
    },
    "updated_fields": ["short_description", "description", "tags"],
    "embeddings": { "requested": true, "status": "queued" },
    "audit": { "log_id": "uuid", "event": "product_ai_improved" }
  },
  "meta": { "request_id": "uuid", "workspace_id": "uuid", "timestamp": "..." }
}
```

**Prompt de IA (resumo):**
- System: "Especialista em copywriting de produtos. Gerar conteudo no tom e lingua pedidos. Respeitar limites de comprimento."
- User: Dados do produto (nome, categoria, preco, descricao atual, SKU) + inputs_override (features, materiais, dimensoes, publico-alvo)
- Tool calling com funcao `improve_product` para output estruturado (short_description, long_description, bullets, tags, seo_snippet)
- Apenas os campos com `generate[field] = true` serao pedidos no prompt

### 2. `supabase/config.toml`

Adicionar:
```text
[functions.product-ai-improve]
verify_jwt = false
```

### 3. `src/components/mqpc/MQPCStepExtras.tsx`

Atualizar o botao "Melhorar com IA" para chamar a nova Edge Function quando o produto ja foi criado (pos-criacao), ou manter o fluxo atual para pre-criacao (pois o produto ainda nao existe na DB).

**Duas abordagens possiveis:**

**Abordagem A (recomendada):** Como o MQPC chama `product-ai-improve` APOS a criacao via `product-quick-create`, o botao "Melhorar com IA" no step 3 continua a usar o fluxo atual (`ai-product-assistant` com mode `generate-description`) porque o produto ainda nao existe. A nova function `product-ai-improve` sera usada em contextos pos-criacao (pagina de edicao de produto, detalhe de produto).

Neste caso, as alteracoes ao `MQPCStepExtras` sao minimas -- nenhuma alteracao necessaria.

**Abordagem B:** Alterar o fluxo do MQPC para primeiro criar o produto (via `product-quick-create`) e depois melhorar com IA (via `product-ai-improve`). Isto muda significativamente o UX do wizard.

**Decisao: Abordagem A** -- o `MQPCStepExtras` mantem-se inalterado. A nova function sera integrada futuramente na pagina de edicao de produtos.

### 4. Hook: `src/hooks/useProductAIImprove.ts` (Novo)

Criar hook para facilitar a integracao futura:

```text
interface AIImproveRequest {
  productId: string;
  goals?: { tone?: string; language?: string; seo?: boolean; max_length?: { short_description?: number; seo_snippet?: number } };
  generate?: { short_description?: boolean; long_description?: boolean; bullets?: boolean; tags?: boolean; seo_snippet?: boolean };
  inputsOverride?: { key_features?: string[]; materials?: string; dimensions?: string; target_audience?: string };
  options?: { write_back?: boolean; create_embeddings?: boolean; channel?: string };
}

Retorna useMutation com:
  - mutateAsync(request) -> AIImproveResult
  - isPending, isError, error
```

O hook chama `supabase.functions.invoke("product-ai-improve")` com `X-Workspace-Id` no header.

## Detalhes tecnicos

### Prompt com tool calling

Para extrair output estruturado, a Edge Function usa tool calling em vez de pedir JSON no prompt:

```text
tools: [{
  type: "function",
  function: {
    name: "improve_product",
    description: "Return improved product content",
    parameters: {
      type: "object",
      properties: {
        short_description: { type: "string" },
        long_description: { type: "string" },
        bullets: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        seo_snippet: { type: "string" }
      },
      required: [campos solicitados em generate],
      additionalProperties: false
    }
  }
}]
tool_choice: { type: "function", function: { name: "improve_product" } }
```

### Write-back para DB

Mapeamento de campos:
- `generated.short_description` -> `products.short_description`
- `generated.long_description` -> `products.commercial_description`
- `generated.tags` -> `products.search_keywords` (join com ", ")
- `generated.seo_snippet` -> nao tem coluna dedicada; guardar em `products.specifications.seo_snippet` (campo jsonb)

### Embeddings (fire-and-forget)

Se `options.create_embeddings = true`:
- Chamar `fetch(supabaseUrl + "/functions/v1/product-embedding", { body: { productId } })` internamente
- Nao esperar pela resposta (fire-and-forget)
- Retornar `embeddings: { requested: true, status: "queued" }`

## Ficheiros criados/modificados

| Ficheiro | Acao |
|---|---|
| `supabase/functions/product-ai-improve/index.ts` | Novo |
| `supabase/config.toml` | Modificado (nova entry) |
| `src/hooks/useProductAIImprove.ts` | Novo (hook de integracao) |

