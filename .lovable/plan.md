

# activity_logs -- Completar metadata do audit log

## Resumo

O audit log já é criado correctamente na tabela `crm_activities` pelo `product-quick-create`. Faltam apenas 2 campos no objecto `metadata`: `status` e `category_id`.

## Alteração

### Modificar `supabase/functions/product-quick-create/index.ts` (linhas 296-301)

Adicionar `status` e `category_id` ao objecto `metadata` do INSERT em `crm_activities`:

```text
metadata: {
  channel: options.channel,
  is_quick_created: options.is_quick_created,
  images_count: promotedImages.length,
  device: clientInfo.device,
  status: newProduct.status,          // NOVO
  category_id: newProduct.category_id, // NOVO
},
```

## Impacto

- Zero alterações no schema da BD (metadata é JSONB, aceita campos adicionais).
- Zero alterações no frontend -- o `ActivityFeed` e `OrderAuditTrail` já consomem metadata como objecto genérico.
- Apenas 2 linhas adicionadas ao edge function.

## Ficheiros modificados

| Ficheiro | Acção |
|---|---|
| `supabase/functions/product-quick-create/index.ts` | 2 campos adicionados ao metadata do audit log |

