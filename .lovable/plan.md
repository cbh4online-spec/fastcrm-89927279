

# Prevenir Produtos Duplicados na Loja Online

## Diagnóstico

Existem 3 pontos de criação de produtos:

1. **`CreateProductDialog`** (formulário completo via `useCreateProduct`) — **sem verificação de duplicados**
2. **`StoreQuickProductDialog`** (criação rápida na loja) — **já tem verificação** por SKU e nome
3. **`MQPCWizard`** → edge function `product-quick-create` — **sem verificação de duplicados**

## Plano

### 1. Adicionar verificação de duplicados ao `useCreateProduct` (`src/hooks/useProducts.ts`)
Antes do `insert`, verificar se já existe produto com o mesmo SKU (se preenchido) ou mesmo nome no workspace. Lançar erro descritivo se encontrar.

### 2. Adicionar verificação de duplicados à edge function `product-quick-create`
Após validação do body (passo 5) e antes do insert (passo 8), verificar duplicados por SKU e nome no workspace. Retornar erro 409 (Conflict) com mensagem clara.

### 3. Adicionar índice único parcial na base de dados
Criar índice único em `products(workspace_id, LOWER(sku))` onde `sku IS NOT NULL` — garantia a nível de DB de que não existem SKUs duplicados no mesmo workspace. O nome é mais difícil de restringir com índice (podem existir variantes), por isso fica apenas como validação aplicacional.

### 4. Mostrar feedback no `CreateProductDialog`
Adicionar estado `duplicateWarning` e exibir alerta antes de submeter, semelhante ao que já existe no `StoreQuickProductDialog`.

## Ficheiros a modificar
1. `src/hooks/useProducts.ts` — adicionar check de duplicados no `useCreateProduct`
2. `supabase/functions/product-quick-create/index.ts` — adicionar check antes do insert
3. **Migração SQL** — criar índice único parcial em `products(workspace_id, lower(sku))`
4. `src/components/products/CreateProductDialog.tsx` — mostrar warning de duplicado

