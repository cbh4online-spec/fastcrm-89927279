

# Listing Detail — Vinted/KuantoKusta-style Redesign

## Problem
The listing detail page (`C2CListingDetail.tsx`) looks disconnected from the marketplace. It lacks a footer, trust signals, related products, and the immersive marketplace feel that Vinted and KuantoKusta provide.

## Solution
Transform the listing detail into a full marketplace experience with sticky bottom action bar (mobile), trust badges, related listings carousel, seller card, and marketplace footer — all matching the existing `C2CPublicMarketplace` visual language.

### Changes to `src/pages/c2c/C2CListingDetail.tsx`

**1. Sticky bottom action bar (mobile, Vinted-style)**
- Fixed bar at bottom on mobile with price, "Comprar" and "Fazer Oferta" buttons
- Hidden on desktop where the sidebar already shows actions
- Safe area padding for notch devices

**2. Seller card redesign**
- Avatar with rating stars, member since date, response time
- "Ver perfil" and "Contactar" side-by-side buttons
- Verified badge if applicable

**3. Trust & protection section**
- Below the description: row of icons (ShieldCheck, Truck, RotateCw, CreditCard) with labels like "Pagamento Protegido", "Envio Nacional", "Devoluções 14 dias", "Checkout Seguro"

**4. Related listings carousel**
- Query listings from same category (exclude current)
- Reuse `ListingCard` in carousel variant
- Section title: "Produtos semelhantes"

**5. Marketplace footer**
- Match the footer from `C2CPublicMarketplace`: copyright, commission info
- Add links: Privacidade, Termos, RGPD

**6. Breadcrumb navigation**
- Below header: `Marketplace > Categoria > Título do produto` with links

### Files
| File | Action |
|------|--------|
| `src/pages/c2c/C2CListingDetail.tsx` | Major redesign: add footer, sticky mobile bar, trust section, related listings, breadcrumb |

