

# Diagnóstico e Correção da Lentidão na Criação de Produtos

## Problemas Identificados

### 1. Criação sequencial produto-a-produto (principal bottleneck)
`createSelectedProducts` (linha 413-440) cria cada produto **um a um** num loop `for...of`. Cada chamada a `createProduct.mutateAsync()` executa **4 queries DB sequenciais**:
- Query 1: Verificar SKU duplicado
- Query 2: Verificar nome duplicado
- Query 3: `ensureCategoryExists` (verificar + possível insert)
- Query 4: Insert do produto

Para 100 produtos = **400 queries sequenciais**.

### 2. Invalidação de cache + toast em cada produto
O `onSuccess` do `useCreateProduct` chama `queryClient.invalidateQueries(["products"])` e `toast.success()` **em cada produto criado** — causando re-renders massivos e spam de toasts.

### 3. Batch de IA com BATCH_SIZE = 2
O `processSkus` processa apenas **2 SKUs por vez** com 1s de delay entre batches. Para 100 SKUs = ~50 segundos só de delays.

## Correções Propostas

### Ficheiro: `src/components/products/BatchSKUImportDialog.tsx`

**A. Criação em batch direto (bypass do hook individual)**
- Substituir o loop sequencial `createProduct.mutateAsync()` por uma chamada direta ao Supabase com **batch insert** de até 500 produtos de uma vez
- Fazer verificação de SKUs duplicados com uma única query `IN(...)` antes do insert
- Chamar `ensureCategoryExists` apenas para categorias únicas (não para cada produto)
- Invalidar queries **uma única vez** no final
- Mostrar **um único toast** com resumo

**B. Aumentar BATCH_SIZE de IA para 5**
- `BATCH_SIZE = 5` e `BATCH_DELAY_MS = 500` — processamento IA 5x mais rápido

### Ficheiro: `src/hooks/useProducts.ts`

**C. Adicionar `useCreateProductsBatch` mutation**
- Nova mutation que aceita array de produtos
- Faz dedup de categorias e cria-as em batch
- Faz um único `supabase.from("products").insert(items)` com array
- Um único `invalidateQueries` e `emitKernelEvent` no final

## Impacto Estimado

| Cenário (100 produtos) | Antes | Depois |
|---|---|---|
| Queries DB | ~400 | ~5 |
| Toasts | 100 | 1 |
| Re-renders | ~200 | ~2 |
| Tempo total | ~60-120s | ~3-5s |

