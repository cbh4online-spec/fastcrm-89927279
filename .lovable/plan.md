

# product_images -- storage_path e promoção robusta

## Resumo

Adicionar a coluna `storage_path` à tabela `product_images` para guardar o path final no Storage, e melhorar o fluxo de promoção de imagens no `product-quick-create` com atualização do `storage_upload_intents` para `promoted`.

## Alterações

### 1. Migration: Adicionar `storage_path` à tabela `product_images`

```text
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS storage_path TEXT;
```

Coluna nullable -- imagens já existentes (criadas antes desta migração) ficam com `NULL` e continuam a funcionar normalmente via `url`.

### 2. Modificar `supabase/functions/product-quick-create/index.ts`

**2a. Incluir `storage_path` no INSERT de `product_images` (linhas 237-247):**

Atualmente o insert usa apenas `url`, `alt_text`, `position`. Adicionar `storage_path: newPath` para guardar o path final no bucket.

**2b. Atualizar `storage_upload_intents` para `promoted` após move bem-sucedido:**

Após o `storage.move()` com sucesso, fire-and-forget update:

```text
adminClient
  .from("storage_upload_intents")
  .update({ status: "promoted", updated_at: new Date().toISOString() })
  .eq("id", fileId);
```

**2c. Marcar intent como erro se promoção falhar:**

Se o `storage.move()` falhar, em vez de apenas `continue`, também atualizar o intent:

```text
adminClient
  .from("storage_upload_intents")
  .update({ status: "expired", updated_at: new Date().toISOString() })
  .eq("id", fileId);
```

Usa `expired` porque a imagem tmp não foi promovida e será elegível para cleanup.

### 3. Fluxo atualizado do ciclo de vida

```text
issued --> uploaded --> promoted (sucesso)
  |            |
  |            +--> expired (promoção falhou)
  |
  +--> expired (URL expirou sem upload)
```

### 4. Resposta -- incluir `storage_path` no array `images`

O objecto `promotedImages` já inclui `storage_path`. Nenhuma alteração necessária no response payload.

## Ficheiros criados/modificados

| Ficheiro | Acção |
|---|---|
| Migration SQL | Adicionar coluna `storage_path` a `product_images` |
| `supabase/functions/product-quick-create/index.ts` | storage_path no insert + update intents para promoted/expired |

