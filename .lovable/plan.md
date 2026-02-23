

# product-quick-create -- Campos em falta e slug unico

## Resumo

Adicionar 3 colunas em falta na tabela `products` (`tax_included`, `tags`, `barcode`), criar constraint de slug unico por workspace, e atualizar a Edge Function para usar estes campos e resolver conflitos de slug automaticamente.

## Alteracoes

### 1. Migration: Novas colunas + constraint de slug unico

```text
-- Novas colunas
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tax_included BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Slug unico por workspace (parcial, ignora NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_workspace_unique
  ON public.products (workspace_id, sheet_slug)
  WHERE sheet_slug IS NOT NULL;
```

Nota: `tax_included` com default `true` (padrao europeu, IVA incluido). `tags` como `TEXT[]` (consistente com `benefits`, `business_types`).

### 2. Modificar `supabase/functions/product-quick-create/index.ts`

**2a. Incluir novos campos no INSERT (linha ~149-172):**

Adicionar ao objecto de insert:
- `tax_included: product.price?.tax_included ?? true`
- `tags: product.tags || []`
- `barcode: product.barcode || null`

**2b. Resolver conflito de slug (antes do INSERT):**

Apos gerar o slug base, verificar se ja existe no workspace. Se existir, adicionar sufixo numerico:

```text
// Pseudocodigo
let finalSlug = slug;
if (slug) {
  const { data: existing } = await adminClient
    .from("products")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("sheet_slug", slug)
    .maybeSingle();

  if (existing) {
    // Buscar quantos slugs comecam com este prefixo
    const { count } = await adminClient
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .like("sheet_slug", `${slug}%`);

    finalSlug = `${slug}-${(count || 1) + 1}`;
  }
}
```

**2c. Incluir novos campos na resposta (linha ~278-296):**

Adicionar `tax_included`, `tags`, `barcode` ao objecto `product` do response payload.

### 3. Impacto no fluxo existente

- O `MQPCWizard.tsx` nao precisa de alteracoes -- os novos campos sao opcionais e tem defaults no servidor.
- O `MQPCStepExtras.tsx` ja podera enviar `tags` no futuro quando essa UI existir.
- A constraint de slug unico protege contra duplicados mesmo em chamadas concorrentes.

## Ficheiros criados/modificados

| Ficheiro | Acao |
|---|---|
| Migration SQL | 3 colunas novas + unique index no slug |
| `supabase/functions/product-quick-create/index.ts` | Modificado (novos campos + slug conflict resolution) |

