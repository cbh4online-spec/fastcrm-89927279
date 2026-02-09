
# Analytics da Loja - Estilo Amazon Seller Central

Estudo do Amazon Seller Central e aplicacao ao dashboard de analytics da loja, transformando-o num painel completo e profissional.

---

## O que o Amazon Seller Central oferece (e vamos replicar)

1. **Business Report Dashboard** - KPIs com sparklines, comparacao temporal
2. **Sales Dashboard** - Receita, unidades vendidas, encomendas com graficos sobrepostos
3. **Inventory Performance** - Stock, produtos sem stock, alertas
4. **Conversion Funnel** - Sessoes -> Visualizacoes -> Carrinho -> Compra
5. **Customer Metrics** - Novos vs recorrentes, taxa de retorno
6. **Product Performance Table** - Tabela detalhada tipo spreadsheet com todas as metricas por produto
7. **Coupons & Promotions Report** - Desempenho de cupoes
8. **Order Defect Rate** - Cancelamentos, devolucoess
9. **Geographic/Time Heatmap** - Vendas por hora/dia da semana

---

## Plano de Implementacao

### 1. Nova tabela: `store_page_views` (para funil de conversao)
Criar tabela para tracking de visualizacoes de produto (anonimo, sem auth obrigatorio):
- `product_id`, `workspace_id`, `session_id` (UUID gerado no browser), `created_at`
- Componente de tracking automatico na pagina de produto
- RLS: insert publico, select por workspace admin

### 2. Hook `useStoreAnalytics` - Expandir com novas metricas
Adicionar queries para:
- **Funil de conversao**: views -> cart adds -> orders -> paid
- **Unidades vendidas** (total e por periodo)
- **Clientes unicos** e taxa de recorrencia
- **Performance de cupoes**: usos, receita com desconto, desconto total dado
- **Taxa de cancelamento/defeito**
- **Vendas por dia da semana e hora** (heatmap data)
- **Stock alerts**: produtos com stock baixo ou esgotados
- **Revenue por categoria**

### 3. Redesign completo do `StoreAnalyticsPage` com tabs Amazon-style

**Tab "Resumo" (Overview)**
- KPIs expandidos: Receita, Encomendas, Unidades, AOV, Conversao, Clientes Unicos
- Cada KPI com mini sparkline inline (como Amazon)
- Comparacao percentual vs periodo anterior com setas coloridas
- Grafico principal: Receita + Encomendas em dual-axis chart (Area + Line)

**Tab "Vendas" (Sales)**
- Grafico de receita diaria com toggle: receita / unidades / encomendas
- Breakdown por status (paid, shipped, delivered) em stacked bar
- Revenue por categoria (horizontal bar chart)
- Vendas por dia da semana (bar chart) + por hora (heatmap simplificado)

**Tab "Produtos" (Product Performance)**
- Tabela completa estilo Amazon com colunas:
  - Produto (imagem + nome), Unidades, Receita, Views, Conversao, Stock, Rating medio
- Ordenavel por qualquer coluna
- Barra de progresso visual para stock
- Badges de alerta (stock baixo, sem stock, best seller)

**Tab "Clientes"**
- Total clientes unicos
- Novos vs recorrentes (pie chart)
- Top 10 clientes por valor gasto
- Taxa de recompra

**Tab "Cupoes"**
- Lista de cupoes com metricas: usos, receita gerada, desconto total
- Grafico de uso ao longo do tempo

**Tab "Inventario"**
- Vista geral do stock: em stock, baixo, esgotado (donut chart)
- Lista de produtos com stock critico
- Alertas visuais

### 4. Componente de tracking `StoreProductViewTracker`
- Componente invisivel colocado na pagina de produto
- Gera `session_id` em localStorage
- Regista view ao montar (com debounce para evitar duplicados na mesma sessao)

### 5. Melhorias visuais gerais
- Cards com gradientes subtis e sombras como Amazon
- Tooltips ricos nos graficos
- Animacoes de entrada com framer-motion
- Skeleton loaders em todos os blocos
- Responsive: tabs colapsam em mobile, tabelas com scroll horizontal

---

## Detalhes Tecnicos

### Migracao SQL
```sql
CREATE TABLE store_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_store_page_views_ws ON store_page_views(workspace_id, created_at);
CREATE INDEX idx_store_page_views_product ON store_page_views(product_id, created_at);
-- RLS: public insert, workspace admin select
```

### Ficheiros a criar
- `src/components/store/StoreProductViewTracker.tsx`

### Ficheiros a modificar
- `src/hooks/useStoreAnalytics.ts` - Expandir com todas as novas queries
- `src/pages/StoreAnalyticsPage.tsx` - Redesign completo com tabs
- `src/pages/store/StoreProductPage.tsx` - Adicionar o tracker de views

### Dependencias
- Nenhuma nova - usa recharts, framer-motion e radix tabs ja instalados
