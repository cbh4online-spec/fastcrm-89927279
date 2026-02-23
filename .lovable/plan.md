

# Cenarios de falha -- Storage move (tmp -> final)

## Problema actual

Quando o `storage.move()` falha (linha 227), o codigo apenas faz `continue` -- salta a imagem silenciosamente. O produto fica criado com `status='active'` mesmo que **todas** as imagens tenham falhado. Nao ha registo de erro no audit log.

## Alteracoes propostas

### 1. Migracoes BD -- Adicionar coluna `metadata` a tabela `products`

A tabela `products` nao tem coluna `metadata`. Adicionar uma coluna JSONB nullable para armazenar informacao de erro e outros dados operacionais:

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
```

### 2. Logica de falha no Edge Function `product-quick-create/index.ts`

Apos o loop de imagens (depois da linha 272), adicionar verificacao de falhas:

**Condicao**: Se o produto foi pedido com imagens (`images.length > 0`) mas nenhuma foi promovida (`promotedImages.length === 0`), ou se houve falhas parciais:

```text
totalFailed = images.length - promotedImages.length
allFailed = totalFailed === images.length && images.length > 0
```

**Se TODAS as imagens falharam** (`allFailed`):
1. UPDATE `products` -- forcar `status = 'draft'` e gravar `metadata = { last_error: 'STORAGE_MOVE_FAILED', failed_at, failed_images_count }`
2. INSERT `crm_activities` -- evento `product_image_finalize_failed` com detalhes no metadata

**Se houve falhas parciais** (algumas moveram, outras nao):
1. UPDATE `products` -- gravar `metadata = { partial_image_failure: true, failed_images_count }` (manter status original)
2. INSERT `crm_activities` -- evento `product_image_finalize_partial` com contagem

### 3. Detalhes da implementacao

No ficheiro `supabase/functions/product-quick-create/index.ts`, apos o loop de imagens (linha 272) e antes do UPDATE de `publicUrls` (linha 274):

```text
const totalRequested = images.length;
const totalFailed = totalRequested - promotedImages.length;
const allImagesFailed = totalFailed > 0 && totalFailed === totalRequested;

if (allImagesFailed) {
  // Forcar draft -- produto sem imagens nao deve ficar activo
  status = "draft";
  await adminClient
    .from("products")
    .update({
      status: "draft",
      store_published: false,
      metadata: {
        last_error: "STORAGE_MOVE_FAILED",
        failed_at: new Date().toISOString(),
        failed_images_count: totalFailed,
        requested_images_count: totalRequested,
      },
    })
    .eq("id", productId);

  // Audit log de falha
  await adminClient
    .from("crm_activities")
    .insert({
      workspace_id: workspaceId,
      entity_type: "product",
      entity_id: productId,
      activity_type: "product_image_finalize_failed",
      title: `Falha ao finalizar imagens: ${name}`,
      description: `Todas as ${totalRequested} imagens falharam no move storage`,
      performed_by: userId,
      metadata: {
        channel: options.channel,
        failed_images_count: totalFailed,
        requested_images_count: totalRequested,
        error_type: "STORAGE_MOVE_FAILED",
      },
    });

  // Atualizar newProduct.status para resposta correcta
  newProduct.status = "draft";

} else if (totalFailed > 0) {
  // Falha parcial -- manter status, registar warning
  await adminClient
    .from("products")
    .update({
      metadata: {
        partial_image_failure: true,
        failed_images_count: totalFailed,
        successful_images_count: promotedImages.length,
        failed_at: new Date().toISOString(),
      },
    })
    .eq("id", productId);

  await adminClient
    .from("crm_activities")
    .insert({
      workspace_id: workspaceId,
      entity_type: "product",
      entity_id: productId,
      activity_type: "product_image_finalize_partial",
      title: `Falha parcial nas imagens: ${name}`,
      description: `${totalFailed} de ${totalRequested} imagens falharam`,
      performed_by: userId,
      metadata: {
        channel: options.channel,
        failed_images_count: totalFailed,
        successful_images_count: promotedImages.length,
      },
    });
}
```

### 4. Sobre DELETE de product_images

Nao e necessario DELETE explicito -- o codigo actual so insere em `product_images` **apos** o move ter sucesso (linha 249-261). Se o move falha, o `continue` na linha 235 salta o INSERT. Logo nao ha registos orfaos de `product_images` para limpar.

## Ficheiros modificados

| Ficheiro | Accao |
|---|---|
| Migracao SQL | Adicionar coluna `metadata` JSONB a `products` |
| `supabase/functions/product-quick-create/index.ts` | Bloco de tratamento de falha apos loop de imagens |

## Impacto

- Produto nunca fica `active` sem imagens quando foram pedidas
- Audit trail completo para debugging
- Zero breaking changes no frontend (metadata e campo novo, opcional)
- Resposta da API continua a funcionar -- apenas `status` muda para `draft` em caso de falha total
