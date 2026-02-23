

# Edge Function: product-quick-create

## Resumo

Criar a Edge Function `product-quick-create` que centraliza a criacao de produtos via MQPC, com validacao server-side, idempotencia, promocao de imagens de tmp/ para path final, registo de auditoria, e resposta estruturada.

## Alteracoes

### 1. Migracao DB: Tabela `product_creation_idempotency`

```text
CREATE TABLE public.product_creation_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  workspace_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(idempotency_key, workspace_id)
);

ALTER TABLE public.product_creation_idempotency ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read their own keys
CREATE POLICY "Members can view own idempotency keys"
  ON public.product_creation_idempotency FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Index for fast lookup and expiry cleanup
CREATE INDEX idx_idempotency_key_workspace ON public.product_creation_idempotency(idempotency_key, workspace_id);
CREATE INDEX idx_idempotency_expires ON public.product_creation_idempotency(expires_at);
```

### 2. Nova Edge Function: `supabase/functions/product-quick-create/index.ts`

**Fluxo completo:**

1. CORS preflight
2. Validar JWT via `getClaims()`
3. Ler `X-Workspace-Id` (obrigatorio) e `X-Idempotency-Key` (opcional mas recomendado)
4. Validar workspace membership (role: owner, admin, agent)
5. Se idempotency key presente: verificar se ja existe registo -- se sim, retornar `response_payload` guardado com status 200
6. Validar body (schema abaixo)
7. Resolver categoria: buscar nome da categoria via `product_categories` usando `product.category_id`
8. Se `options.publish_now = true`, forcar `status = "active"`
9. Se `options.generate_slug = true`, gerar slug a partir do nome
10. Inserir produto na tabela `products`
11. Promover imagens: para cada item em `images[]`, copiar de `tmp/{file_id}.jpg` para `products/{product_id}/{file_id}.jpg` via Storage API (copy + delete old), e inserir registo em `product_images`
12. Atualizar campo `images` (array de URLs) no produto criado
13. Se `options.create_audit_log = true`, inserir registo em `crm_activities`
14. Guardar response_payload na tabela de idempotency (se key fornecida)
15. Retornar resposta estruturada

**Validacoes do body:**
- `product.name`: string, 2-120 chars, obrigatorio
- `product.price.amount`: number > 0, obrigatorio
- `product.category_id`: uuid, obrigatorio
- `product.status`: "draft" | "active", default "draft"
- `images`: array 0-6 elementos
- Cada imagem: `file_id` (uuid), `storage_path` (string), `position` (number >= 1)

**Respostas de erro (mesmo formato que presign):**
- 401 UNAUTHORIZED
- 403 FORBIDDEN
- 400 VALIDATION_ERROR
- 409 IDEMPOTENCY_CONFLICT (se key repetida mas com payload diferente)
- 500 INTERNAL_ERROR

**Resposta 201 (sucesso):**
```text
{
  "success": true,
  "data": {
    "product": { id, workspace_id, name, slug, status, price_amount, currency, category_id, ... },
    "images": [{ id, product_id, storage_path, public_url, position, alt }],
    "inventory": { track_stock, quantity, in_stock },
    "audit": { log_id, event: "product_created" }
  },
  "meta": { request_id, workspace_id, timestamp }
}
```

### 3. `supabase/config.toml`

Adicionar:
```text
[functions.product-quick-create]
verify_jwt = false
```

### 4. `src/components/mqpc/MQPCWizard.tsx`

Substituir a chamada `useCreateProduct` pela chamada direta a `supabase.functions.invoke("product-quick-create")`:

- Gerar `X-Idempotency-Key` unica: `mqpc:{workspaceId}:{Date.now()}:{random}`
- Guardar a key em `useRef` para que retries usem a mesma key
- Construir o body no formato novo:
  ```text
  {
    product: { name, price: { amount, currency: "EUR", tax_included: true }, category_id, status, short_description, description: commercial_description, sku },
    images: imagesArray com file_id, storage_path, position, alt,
    inventory: { track_stock: !!stockQuantity, quantity: stockQuantity || null, in_stock: true },
    variants: [],
    options: { publish_now, generate_slug: true, channel: "mobile_quick", is_quick_created: true, create_audit_log: true },
    client: { device: "mobile", app_version: "fastcrm-web", locale: "pt-PT" }
  }
  ```
- Remover import de `useCreateProduct`
- Usar `supabase.functions.invoke` com headers `Authorization` (automatico), `X-Workspace-Id`, `X-Idempotency-Key`
- Processar resposta: verificar `data.success`, extrair `data.data.product`
- Em caso de erro, mostrar `data.message` ou `error.message`

### 5. Promocao de imagens (detalhe tecnico)

Na Edge Function, apos criar o produto:
- Para cada imagem, usar `adminClient.storage.from("product-images").move(oldPath, newPath)` onde:
  - `oldPath = workspaces/{workspaceId}/products/tmp/{file_id}.jpg`
  - `newPath = workspaces/{workspaceId}/products/{product_id}/{file_id}.jpg`
- Inserir registo em `product_images` com o novo path e URL publica
- Atualizar o array `images` no produto com as URLs publicas finais

## Ficheiros criados/modificados

| Ficheiro | Acao |
|---|---|
| Migracao SQL | Nova (tabela product_creation_idempotency) |
| `supabase/functions/product-quick-create/index.ts` | Novo |
| `supabase/config.toml` | Modificado (nova entry) |
| `src/components/mqpc/MQPCWizard.tsx` | Modificado (usar edge function) |

