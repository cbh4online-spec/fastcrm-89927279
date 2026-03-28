

# Adicionar eBooks ao Funil

## Abordagem
Seguir o padrão exacto da tab "Products" (`FunnelProductsTab`) — criar uma nova tab "eBooks" no `FunnelBuilder` com a mesma estrutura: listar eBooks associados, adicionar/remover com pesquisa.

## Alterações

### 1. Migração SQL — tabela `funnel_ebooks`
Criar tabela `funnel_ebooks` com a mesma estrutura da `funnel_products`:
- `id`, `funnel_id` (FK → funnels), `ebook_id` (FK → ebooks), `workspace_id`, `position` (main/lead_magnet/bonus), `order_index`, `created_at`
- RLS policies usando `is_workspace_member`

### 2. Hook — `src/hooks/useFunnelEbooks.ts`
Seguindo o padrão de `useFunnelProducts.ts`:
- `useFunnelEbooks(funnelId)` — lista eBooks do funil com join aos dados do ebook (título, status)
- `useAddFunnelEbook()` — associa um eBook
- `useRemoveFunnelEbook()` — remove associação

### 3. Componente — `src/components/funnels/tabs/FunnelEbooksTab.tsx`
Seguindo o padrão visual de `FunnelProductsTab`:
- Tabela com colunas: Título, Status, Posição, Acção (remover)
- Dialog de adição com pesquisa por nome e selector de posição (Lead Magnet / Bónus / Principal)
- Estado vazio com ícone BookOpen

### 4. Integração — `FunnelBuilder.tsx`
- Adicionar `TabsTrigger value="ebooks"` com label "eBooks"
- Adicionar `TabsContent` com `<FunnelEbooksTab funnelId={funnelId} />`

