
# Fix: Erro ao clicar em Avatar/Logotipo no Hero

## Problema

Ao alterar o tipo de media do bloco Hero para "avatar" ou "logo", o update do bloco falha com o erro "Cannot coerce the result to a single JSON object". O pedido PATCH ao `bio_blocks` devolve 0 linhas (status 406).

Existem dois problemas:

1. **`.single()` no update**: A mutacao `useUpdateBioBlock` usa `.single()` que falha quando a query devolve 0 linhas (por exemplo, se a politica RLS filtrar o resultado).
2. **Campos extra no payload**: A destructuring `{ id, bio_page_id, ...input }` pode estar a enviar campos como `created_at` ou `workspace_id` no update, causando conflitos.

## Solucao

Substituir `.single()` por `.maybeSingle()` na mutacao `useUpdateBioBlock`, e adicionar tratamento para quando o resultado e null.

## Alteracao

| Ficheiro | O que muda |
|---|---|
| `src/hooks/useBioBlocks.ts` | Linha 76: `.single()` -> `.maybeSingle()` na funcao `useUpdateBioBlock` + tratamento de null |

### Detalhe Tecnico

```typescript
// De:
const { data, error } = await supabase
  .from("bio_blocks")
  .update(input as any)
  .eq("id", id)
  .select()
  .single();
if (error) throw error;
return { ...data, bio_page_id } as BioBlock;

// Para:
const { data, error } = await supabase
  .from("bio_blocks")
  .update(input as any)
  .eq("id", id)
  .select()
  .maybeSingle();
if (error) throw error;
if (!data) throw new Error("Bloco nao encontrado ou sem permissao");
return { ...data, bio_page_id } as BioBlock;
```

### Resultado

O erro desaparece. Se o update nao devolver resultados (por RLS ou outro motivo), mostra uma mensagem de erro clara em vez de crashar.
