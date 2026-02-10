# Plano Geral — Funcionalidades E-commerce Avançadas

## Estado

- [x] Gift Cards / Cartões Presente ✅ (implementado)
- [ ] **Fase 1: Marketplace C2C** ← próxima
- [ ] Fase 2: Comparador de Preços
- [ ] Fase 3: Sponsors / Publicidade
- [ ] Fase 4: Clube / Comunidade

---

## Fase 1: Marketplace C2C (Independente)

Secção separada tipo OLX/Vinted onde utilizadores registados criam anúncios de produtos próprios. Publicação automática com moderação por filtros.

### Base de Dados
- `c2c_listings` — anúncios (título, descrição, preço, fotos[], categoria, condição, vendedor_id, status, localização)
- `c2c_categories` — categorias do marketplace
- `c2c_messages` — mensagens privadas entre comprador/vendedor
- `c2c_reviews` — avaliações pós-transação
- `c2c_favorites` — favoritos/watchlist
- `c2c_reports` — denúncias de anúncios
- `c2c_moderation_settings` — config de filtros (palavras proibidas, limites)

### Funcionalidades
- Criar/editar/remover anúncios com fotos múltiplas (storage)
- Pesquisa full-text e filtros (categoria, preço min/max, condição, localização)
- Mensagens diretas entre utilizadores (realtime)
- Avaliações e score de reputação do vendedor
- Favoritos com notificações de alteração de preço
- **Publicação automática** com filtros: palavras proibidas, detecção de spam, auto-flag para review
- Painel admin: fila de moderação, anúncios reportados, gestão de categorias

### Páginas
- `/marketplace` — listagem com pesquisa e filtros
- `/marketplace/:id` — detalhe do anúncio
- `/marketplace/criar` — formulário de criação
- `/marketplace/meus-anuncios` — gestão dos meus anúncios
- `/marketplace/mensagens` — inbox
- Admin: separador "Marketplace C2C" nas settings

### Ficheiros a criar
- `src/pages/c2c/C2CMarketplace.tsx` — listagem principal
- `src/pages/c2c/C2CListingDetail.tsx` — detalhe
- `src/pages/c2c/C2CCreateListing.tsx` — criar anúncio
- `src/pages/c2c/C2CMyListings.tsx` — meus anúncios
- `src/pages/c2c/C2CMessages.tsx` — mensagens
- `src/hooks/useC2CListings.ts` — CRUD de anúncios
- `src/hooks/useC2CMessages.ts` — mensagens realtime
- `src/hooks/useC2CModeration.ts` — moderação automática
- `src/components/c2c/` — ListingCard, ListingFilters, MessageThread, ReviewForm, etc.

---

## Fase 2: Comparador de Preços

### 2A: Preços Internos
- Widget "Comparar" na página de produto
- Compara produtos da mesma categoria lado a lado
- Tabela comparativa com specs e preços

### 2B: Preços Externos
- Edge function usando Firecrawl para buscar preços em lojas externas
- Widget na página de produto: "Preço noutras lojas"
- Cache de resultados (24h) para performance

### 2C: Histórico de Preços
- `product_price_history` — registo automático via trigger SQL
- Gráfico sparkline na página de produto
- Alerta "Preço mais baixo de sempre" quando aplicável

### Ficheiros a criar
- `src/components/store/PriceComparisonWidget.tsx`
- `src/components/store/PriceHistoryChart.tsx`
- `src/hooks/usePriceComparison.ts`
- `src/hooks/usePriceHistory.ts`
- Edge function: `compare-prices`

---

## Fase 3: Sponsors / Publicidade

### 3A: Banners na Loja
- `store_ad_placements` — slots (homepage-hero, sidebar, between-products, category-header)
- `store_ads` — banner com imagem, link, datas início/fim, impressões, cliques
- Painel admin para criar/gerir campanhas
- Tracking automático de impressões e CTR

### 3B: Produtos Patrocinados (C2C)
- `c2c_sponsored_listings` — boost pago para anúncios C2C
- Vendedores pagam para aparecer no topo (duração configurável)
- Badge "Patrocinado" e prioridade na ordenação
- Integração Stripe para pagamento do boost

### 3C: Parceiros Externos
- `store_sponsors` — parceiros com logo, link, descrição, tier (Gold/Silver/Bronze)
- Secção "Parceiros" no footer/página dedicada
- Painel admin para gerir parceiros

### Ficheiros a criar
- `src/components/store/AdBanner.tsx`
- `src/components/store/SponsoredBadge.tsx`
- `src/components/store-settings/AdsManager.tsx`
- `src/components/store-settings/SponsorsManager.tsx`
- `src/hooks/useStoreAds.ts`
- `src/hooks/useStoreSponsors.ts`

---

## Fase 4: Clube / Comunidade

### 4A: Programa de Fidelidade
- `loyalty_points` — saldo por utilizador/workspace
- `loyalty_transactions` — histórico (compras, reviews, referrals, resgate)
- `loyalty_tiers` — Bronze/Silver/Gold/Platinum com multiplicadores
- `loyalty_rewards` — recompensas (desconto %, produto grátis, frete grátis)
- Dashboard: saldo, nível, progresso, histórico
- Pontos automáticos: compra (1pt/€), review (+50pt), referral (+100pt)

### 4B: Fórum / Discussões
- `forum_categories` — categorias do fórum
- `forum_topics` — tópicos com título, conteúdo, autor, pins, locks
- `forum_posts` — respostas em thread
- `forum_reactions` — likes/útil/concordo
- Publicação automática com filtros de spam e palavras proibidas
- Perfil público com stats e reputação

### 4C: Conteúdo Exclusivo
- `exclusive_content` — artigos/ofertas gated por nível de fidelidade
- Secção "Clube" na loja com preview + lock
- Early access a novos produtos para membros Gold+

### Moderação Automática (Transversal)
- `moderation_filters` — palavras proibidas, regex patterns, config por workspace
- `moderation_queue` — itens flagged para review
- Auto-publish por defeito; flag se suspeito
- Painel admin: fila de moderação, approve/reject, ban user
- Aplicável a: anúncios C2C, posts do fórum, reviews

### Ficheiros a criar
- `src/pages/community/` — Forum, Topic, Profile, Loyalty
- `src/hooks/useLoyalty.ts`, `useForum.ts`, `useModeration.ts`
- `src/components/community/` — TopicCard, PostThread, LoyaltyDashboard, RewardCard
- `src/components/store-settings/ModerationManager.tsx`

---

## Ordem de Implementação

1. **Fase 1: Marketplace C2C** — fundação para sponsors e comunidade
2. **Fase 2: Comparador de Preços** — independente
3. **Fase 3: Sponsors** — depende parcialmente do C2C
4. **Fase 4: Clube/Comunidade** — mais complexo, beneficia das fases anteriores

Cada fase será implementada incrementalmente dentro de múltiplas mensagens.
