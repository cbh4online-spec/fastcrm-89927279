

## Fase 5 -- Catálogo avançado + Stock + Cupões

### O que vai mudar

**1. Gestão de stock**
- Adicionar coluna `stock_quantity` (integer, nullable) na tabela `products`
- Adicionar coluna `track_stock` (boolean, default false) para ativar/desativar tracking
- No webhook/checkout, decrementar stock automaticamente após pagamento
- Alerta visual no admin quando stock < threshold (default 5)
- Bloquear compra na loja se stock = 0

**2. Categorias e filtros**
- Criar tabela `store_categories` (id, workspace_id, name, slug, description, position, is_active)
- Adicionar coluna `store_category_id` (FK) na tabela `products`
- Filtros na loja pública: por categoria, faixa de preço, ordenação
- Gestão de categorias no admin

**3. Cupões de desconto**
- Criar tabela `store_coupons` (id, workspace_id, code, type [percentage|fixed], value, min_order, max_uses, used_count, valid_from, valid_until, is_active)
- Campo de cupão no checkout (passo 2)
- Validação do cupão na edge function antes de criar sessão Stripe
- Aplicar desconto via Stripe coupon/promotion

**4. Página de produto detalhada**
- Rota `/store/:workspaceSlug/product/:productId`
- Galeria de imagens com navegação
- Descrição completa, SKU, preço
- Produtos relacionados (mesma categoria)
- Botão de adicionar ao carrinho

---

### Detalhes técnicos

**Migração SQL:**
```sql
-- Stock
ALTER TABLE products ADD COLUMN stock_quantity integer DEFAULT NULL;
ALTER TABLE products ADD COLUMN track_stock boolean DEFAULT false;

-- Categories
CREATE TABLE store_categories (...)

-- Products FK
ALTER TABLE products ADD COLUMN store_category_id UUID REFERENCES store_categories(id)

-- Coupons
CREATE TABLE store_coupons (...)
```

**Ficheiros novos:**
- `src/pages/store/StoreProductPage.tsx` -- página de produto individual
- `src/pages/StoreCategoriesPage.tsx` -- gestão de categorias admin
- `src/pages/StoreCouponsPage.tsx` -- gestão de cupões admin
- `src/hooks/useStoreCategories.ts`
- `src/hooks/useStoreCoupons.ts`

**Ficheiros a modificar:**
- `src/pages/store/StorePage.tsx` -- filtros de categoria/preço
- `src/pages/store/StoreCheckoutPage.tsx` -- campo de cupão
- `supabase/functions/create-store-checkout/index.ts` -- validar cupão, aplicar desconto
- `supabase/functions/store-webhook/index.ts` -- decrementar stock
- `src/App.tsx` -- nova rota de produto
- Sidebar -- links para categorias e cupões
