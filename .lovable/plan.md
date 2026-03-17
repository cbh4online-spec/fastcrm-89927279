
## Plano: Footer completo estilo marketplace (inspirado em Vinted, sem plágio)

### Situação actual
O footer do marketplace público (`C2CPublicMarketplace.tsx`, linhas 573-583) é minimalista — apenas copyright e uma linha de comissão. As páginas públicas (`C2CPublicListingDetail`, `C2CPublicSellerProfile`, `C2CPublicCategoryPage`, `C2CPublicSearchPage`) provavelmente têm footers similares ou nenhum.

### Solução
Criar um componente reutilizável `MarketplaceFooter` com estrutura em 3 colunas + barra inferior, adaptado ao contexto FastCRM Marketplace:

**Coluna 1 — Marketplace** (equivalente a "Vinted")
- Sobre nós → `/marketplace/:slug/sobre`
- Como funciona → `/marketplace/:slug/como-funciona`
- Sustentabilidade → link estático
- Blog / Novidades → link ou placeholder

**Coluna 2 — Descobrir**
- Categorias populares → scroll para categorias
- Novidades → filtro recentes
- Vendedores verificados → link
- FAQ / Centro de ajuda → link

**Coluna 3 — Ajuda**
- Apoio ao cliente → link contacto/chat
- Vender → redirect sell flow
- Comprar → redirect explore
- Confiança e Segurança → link

**Barra inferior:**
- Ícones sociais (Facebook, Instagram, LinkedIn) — links placeholder
- Links legais: Privacidade, Termos, Cookies, RGPD
- Copyright dinâmico com nome do workspace

### Ficheiros
1. **Criar** `src/components/c2c/MarketplaceFooter.tsx` — componente reutilizável com workspace name/slug como props
2. **Editar** `src/pages/c2c/C2CPublicMarketplace.tsx` — substituir footer inline pelo novo componente
3. **Editar** `src/pages/c2c/C2CPublicListingDetail.tsx` — adicionar o footer (se ausente)
4. **Editar** `src/pages/c2c/C2CPublicSellerProfile.tsx` — adicionar o footer (se ausente)

### Estética
- Mantém o tema dark premium (zinc-900/950 + amber accents)
- Tipografia clean, espaçamento generoso
- Sem badges de App Store (não é app nativa) — diferenciação face ao Vinted
- Layout 3 colunas em desktop, stack em mobile
