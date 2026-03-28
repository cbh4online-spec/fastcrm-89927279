

# C2C Marketplace — Analytics Reais, Trending e Tráfego

## Diagnóstico

1. **Estatísticas mortas**: A RPC `increment_listing_views` existe na BD mas nunca é chamada — `views_count` é sempre 0.
2. **Sem analytics de plataforma**: Não existe dashboard com métricas globais do marketplace (tráfego, conversões, tendências).
3. **Trending é estático**: Não há algoritmo — os "destaques" são apenas `is_featured` manual.
4. **SEO básico**: As páginas públicas já usam `Helmet` e `SchemaOrgProduct`, mas faltam Open Graph tags otimizadas para WhatsApp/Facebook.
5. **Notificações existem** mas são limitadas a mensagens e ofertas — não há alertas de novos produtos em categorias favoritas ou descidas de preço.

## Plano de Implementação

### 1. View Tracking Real
Chamar `increment_listing_views` em ambas as páginas de detalhe (pública e interna) quando um listing é visualizado, com debounce por sessão para evitar inflação.

**Ficheiros**: `C2CPublicListingDetail.tsx`, `C2CListingDetail.tsx`

### 2. Dashboard de Analytics do Marketplace
Criar uma página de analytics para admin/super admin com:
- **KPIs**: Total listings ativos, vendidos, views totais, vendas do mês, taxa de conversão (views → ofertas → vendas)
- **Gráfico de tendência**: Listings criados e vendas por semana (últimas 12 semanas)
- **Top listings**: Mais vistos, mais ofertas
- **Categorias**: Revenue e volume por categoria
- Dados calculados por queries directas às tabelas `c2c_listings`, `c2c_orders`, `c2c_commissions`

**Ficheiros**: Novo `src/pages/c2c/C2CMarketplaceAnalytics.tsx`, novo `src/hooks/useMarketplaceAnalytics.ts`, update routes

### 3. Algoritmo de Trending/Destaque Automático
- **Score de trending** calculado client-side: `views_count * 1 + offers_count * 5 + recency_bonus`
- Secções automáticas no marketplace: "Em Alta" (top por score), "Novidades" (últimos 7 dias), "Mais Vistos"
- Substituir/complementar o `is_featured` manual com este ranking dinâmico

**Ficheiros**: Update `C2CMarketplace.tsx` e `C2CPublicMarketplace.tsx`

### 4. SEO e Partilha Social Otimizada
- Adicionar Open Graph meta tags (`og:title`, `og:description`, `og:image`, `og:price:amount`) nas páginas públicas de listing e marketplace
- Gerar URLs amigáveis com slug do produto quando possível
- Twitter Card tags para partilha rica

**Ficheiros**: Update `C2CPublicListingDetail.tsx`, `C2CPublicMarketplace.tsx`

### 5. Notificações Push de Engagement
- **Novos produtos em categorias favoritas**: Quando um listing é criado numa categoria que o utilizador tem nos favoritos, criar notificação
- **Descida de preço**: Trigger ao editar listing com preço inferior ao anterior
- **Atividade nos favoritos**: Notificar quando um listing favorito recebe oferta ou está "quase vendido"
- Implementar via inserção na tabela `c2c_notifications` existente (já tem realtime configurado)

**Ficheiros**: Update `src/hooks/useC2CListings.ts` (ao criar/editar listing), novo `src/hooks/useC2CPriceAlerts.ts`

## Detalhe Técnico

### View Tracking (debounce)
```text
// Na página de detalhe:
useEffect(() => {
  const key = `c2c_viewed_${listingId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  supabase.rpc("increment_listing_views", { p_listing_id: listingId });
}, [listingId]);
```

### Trending Score
```text
score = views_count + (offers_count * 5) + max(0, 14 - days_since_created) * 3
```
Ordenar listings por score descendente para a secção "Em Alta".

### Analytics Queries
```text
-- KPIs
SELECT count(*) FILTER (status='active') as active,
       count(*) FILTER (status='sold') as sold,
       sum(views_count) as total_views
FROM c2c_listings WHERE workspace_id = ?

-- Weekly trend (listings + sales)
SELECT date_trunc('week', created_at) as week, count(*) 
FROM c2c_listings WHERE created_at > now() - interval '12 weeks'
GROUP BY 1 ORDER BY 1
```

## Ficheiros Resumo

| Ficheiro | Ação |
|---|---|
| `src/hooks/useMarketplaceAnalytics.ts` | **Criar** — queries para KPIs, tendências, top listings |
| `src/pages/c2c/C2CMarketplaceAnalytics.tsx` | **Criar** — dashboard com gráficos Recharts |
| `src/pages/c2c/C2CPublicListingDetail.tsx` | **Editar** — view tracking + OG meta tags |
| `src/pages/c2c/C2CListingDetail.tsx` | **Editar** — view tracking |
| `src/pages/c2c/C2CPublicMarketplace.tsx` | **Editar** — trending algorithm + OG tags |
| `src/pages/c2c/C2CMarketplace.tsx` | **Editar** — secções trending/mais vistos |
| `src/hooks/useC2CListings.ts` | **Editar** — notificações ao criar listing |
| `src/hooks/useC2CPriceAlerts.ts` | **Criar** — lógica de alertas de preço |
| Routes file | **Editar** — adicionar rota analytics |

