
# Edge Function: product-publish

## Resumo

Criar a Edge Function `product-publish` que permite alterar o status de um produto entre `draft` e `active`, separando a logica de publicacao da criacao. Segue o mesmo padrao de autorizacao e resposta das functions `product-quick-create` e `product-ai-improve`.

## Alteracoes

### 1. Nova Edge Function: `supabase/functions/product-publish/index.ts`

**Fluxo:**

1. CORS preflight
2. Validar JWT e extrair `userId`
3. Ler `X-Workspace-Id` (obrigatorio)
4. Validar workspace membership (owner, admin, agent)
5. Parse body: `product_id`, `status`, `options`
6. Validar:
   - `product_id`: uuid, obrigatorio
   - `status`: deve ser `"active"` ou `"draft"` (obrigatorio)
7. Buscar produto via `adminClient.from("products")` com filtro `id = product_id` e `workspace_id` -- se nao encontrado, retornar FORBIDDEN
8. Se `options.require_min_images = true`, verificar que o produto tem pelo menos 1 imagem (array `images` nao vazio ou `product_images` com registos) -- se falhar, retornar VALIDATION_ERROR "Product must have at least one image to publish"
9. Atualizar produto:
   - `status` = valor pedido
   - `store_published` = `status === "active"`
   - `published_at` = `new Date().toISOString()` (se status = active) ou `null` (se draft)
   - `updated_at` = `new Date().toISOString()`
10. Se `options.create_audit_log = true`, inserir registo em `crm_activities` com event `product_published` (se active) ou `product_unpublished` (se draft)
11. Retornar resposta estruturada

**Respostas de erro (mesmo formato):**
- 401 UNAUTHORIZED
- 403 FORBIDDEN (JWT invalido, nao membro, ou produto nao pertence ao workspace)
- 400 VALIDATION_ERROR (body invalido ou imagens insuficientes)
- 500 INTERNAL_ERROR

**Resposta 200 (sucesso):**
```text
{
  "success": true,
  "data": {
    "product_id": "uuid",
    "status": "active",
    "published_at": "2026-02-23T11:00:00Z",
    "audit": { "log_id": "uuid", "event": "product_published" }
  },
  "meta": {
    "request_id": "uuid",
    "workspace_id": "uuid",
    "timestamp": "2026-02-23T11:00:00Z"
  }
}
```

### 2. `supabase/config.toml`

Adicionar:
```text
[functions.product-publish]
verify_jwt = false
```

### 3. Hook: `src/hooks/useProductPublish.ts` (Novo)

Hook com `useMutation` para facilitar integracao no frontend:

```text
interface PublishRequest {
  productId: string;
  status: "active" | "draft";
  options?: {
    require_min_images?: boolean;
    create_audit_log?: boolean;
    channel?: string;
  };
}

interface PublishResult {
  product_id: string;
  status: string;
  published_at: string | null;
  audit: { log_id: string; event: string } | null;
}
```

O hook chama `supabase.functions.invoke("product-publish")` com `X-Workspace-Id` no header e invalida a query cache de produtos apos sucesso.

## Detalhes tecnicos

### Verificacao de imagens (opcional)

Quando `require_min_images = true`:
- Verificar `product.images` (array jsonb) -- se nao vazio, passa
- Fallback: query `product_images` com `product_id` -- se count > 0, passa
- Se ambos vazios, retornar erro 400

### Mapeamento de campos na DB

| Campo response | Campo DB |
|---|---|
| `status` | `products.status` |
| `published_at` | `products.store_published` (boolean) + timestamp no audit log |

Nota: a tabela `products` nao tem coluna `published_at` dedicada. O campo `store_published` (boolean) sera usado para indicar se esta publicado, e o timestamp sera registado via `updated_at` e no audit log.

## Ficheiros criados/modificados

| Ficheiro | Acao |
|---|---|
| `supabase/functions/product-publish/index.ts` | Novo |
| `supabase/config.toml` | Modificado (nova entry) |
| `src/hooks/useProductPublish.ts` | Novo (hook de integracao) |
