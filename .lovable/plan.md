

## Mudar cores do Marketplace C2C para estilo Vinted

### Paleta Vinted (referência)
```text
Background:      #FFFFFF (branco)
Header/Footer:   #FFFFFF (branco, com border cinza claro)
Texto principal: #171717 (quase preto)  
Texto secundário:#757575 (cinza médio)
Accent/CTA:      #09B1BA (teal/verde-azulado)
Accent hover:    #078E96
Borders:         #E5E5E5 (cinza claro)
Cards:           #FFFFFF com border #E5E5E5
Inputs:          #F5F5F5 background
```

### Mapeamento de cores (atual → novo)
```text
bg-zinc-950      → bg-white
bg-zinc-900      → bg-white / bg-gray-50
bg-zinc-800      → bg-gray-100
border-zinc-800  → border-gray-200
border-zinc-700  → border-gray-200
text-zinc-100    → text-gray-900
text-zinc-200    → text-gray-800
text-zinc-300    → text-gray-600
text-zinc-400    → text-gray-500
text-zinc-500    → text-gray-400
text-zinc-600    → text-gray-300
bg-amber-500     → bg-[#09B1BA]
bg-amber-600     → bg-[#078E96]
text-amber-400   → text-[#09B1BA]
text-amber-300   → text-[#078E96]
hover:bg-zinc-800 → hover:bg-gray-100
hover:bg-zinc-700 → hover:bg-gray-200
```

### Ficheiros a alterar (público C2C — ~15 ficheiros)

**Páginas públicas:**
1. `src/pages/c2c/C2CPublicMarketplace.tsx` — Homepage marketplace
2. `src/pages/c2c/C2CPublicListingDetail.tsx` — Detalhe do anúncio
3. `src/pages/c2c/C2CPublicCategoryPage.tsx` — Página de categoria
4. `src/pages/c2c/C2CPublicSearchPage.tsx` — Página de pesquisa
5. `src/pages/c2c/C2CPublicSellerProfile.tsx` — Perfil do vendedor
6. `src/pages/c2c/C2CSellerRegistration.tsx` — Registo de vendedor

**Componentes partilhados:**
7. `src/components/c2c/MarketplaceFooter.tsx` — Footer
8. `src/components/c2c/C2CQuickCheckoutDialog.tsx` — Dialog de compra
9. `src/components/c2c/C2CPublicOfferDialog.tsx` — Dialog de oferta
10. `src/components/c2c/ShareButtons.tsx` — Botões de partilha (variante dark)
11. `src/components/c2c/MarketplaceSearchOverlay.tsx` — Overlay de pesquisa

**Hook de tema:**
12. `src/hooks/c2c/usePublicMarketplaceTheme.ts` — Mudar de forçar dark para forçar light

### Abordagem
- Substituir todas as classes zinc/amber hardcoded pelo mapeamento acima
- Alterar `usePublicMarketplaceTheme` para forçar `light` em vez de `dark`
- Manter as cores semânticas (green para "novo", blue para "como novo", etc.)
- Manter as cores amber em componentes **admin** (dashboard, moderação) — só alterar as páginas **públicas** do marketplace

### Impacto
- Visual completamente alinhado com Vinted (fundo branco, accent teal)
- Zero impacto no backoffice/admin
- Zero alterações de lógica — apenas classes CSS

