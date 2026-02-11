

# Corrigir erro "no field price" e isolar lojas por workspace

## Problemas identificados

### 1. Erro nos triggers da tabela products
Existem dois triggers na tabela `products` que referenciam uma coluna `price` que nao existe -- a coluna chama-se `base_price`:
- **`trg_record_initial_price`**: usa `NEW.price` e `NEW.compare_at_price`
- **`trg_record_price_change`**: usa `OLD.price`, `NEW.price`, `OLD.compare_at_price`, `NEW.compare_at_price`

A coluna `compare_at_price` tambem nao existe na tabela. E por isso que ao ativar/editar produtos aparece o erro "record old has no field price".

### 2. Isolamento de loja por workspace
Cada workspace que instale o modulo `online-store` precisa de ter a sua propria loja acessivel via `/store/:workspaceSlug`. A arquitetura existente ja suporta isto (a loja publica usa o `workspaceSlug` para filtrar produtos). Nao e necessaria nenhuma alteracao estrutural -- apenas confirmar que os dados estao isolados por `workspace_id`.

## Solucao

### Migracao SQL -- corrigir os 2 triggers

Substituir as funcoes dos triggers para usar `base_price` em vez de `price`, e remover a referencia a `compare_at_price` (que nao existe):

```sql
-- Corrigir funcao do trigger de preco inicial
CREATE OR REPLACE FUNCTION public.record_product_initial_price()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.product_price_history 
    (product_id, workspace_id, price, currency)
  VALUES 
    (NEW.id, NEW.workspace_id, NEW.base_price, COALESCE(NEW.currency, 'EUR'));
  RETURN NEW;
END;
$$;

-- Corrigir funcao do trigger de alteracao de preco
CREATE OR REPLACE FUNCTION public.record_product_price_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
    INSERT INTO public.product_price_history 
      (product_id, workspace_id, price, currency)
    VALUES 
      (NEW.id, NEW.workspace_id, NEW.base_price, COALESCE(NEW.currency, 'EUR'));
  END IF;
  RETURN NEW;
END;
$$;
```

### Nenhuma alteracao de codigo necessaria

A loja publica (`/store/:workspaceSlug`) ja filtra produtos por `workspace_id`. Cada workspace que instale o modulo tera a sua propria loja automaticamente. O `StoreQuickProductDialog` e os hooks `useStoreProducts` ja utilizam o `workspace_id` do contexto atual.

## Resumo das alteracoes

| Tipo | Detalhe |
|---|---|
| Migracao SQL | Corrigir 2 funcoes de trigger: `record_product_initial_price` e `record_product_price_change` para usar `base_price` em vez de `price` |
| Codigo | Sem alteracoes necessarias |

