

# Transaction Inbox — Marketplace Mensagens Premium

## Scope
Redesenhar completamente `/dashboard/c2c/messages` como um Transaction Inbox estilo Vinted/Facebook Marketplace, com layout 3 colunas (desktop), tabs (mobile), e integração de negociação + contexto de produto.

## 1. Database Migration

Add columns to `c2c_messages` for message types and metadata:

```sql
ALTER TABLE c2c_messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE c2c_messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

`message_type`: `text` | `system` | `offer` | `image`
`metadata`: `{ offer_id, offer_price, offer_status, listing_status, image_url }`

Enable realtime for `c2c_offers` for live updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.c2c_offers;
```

## 2. Hook Refactor — `useC2CMessages.ts`

**Expand `C2CConversation` interface** to include listing details (photo, price, status, condition, location, seller_id) fetched alongside conversations.

**Expand `C2CMessage` interface** with `message_type` and `metadata`.

**New mutations:**
- `useSendC2COfferMessage` — creates offer in `c2c_offers` + inserts system message in `c2c_messages` (type=`offer`)
- `useUpdateListingStatus` — updates `c2c_listings.status` + inserts system message (type=`system`, e.g. "Marcado como reservado")

**Realtime:** Add subscription to `c2c_offers` changes alongside existing `c2c_messages` subscription.

## 3. New Components (src/components/c2c/inbox/)

### A) `ConversationList.tsx`
- Search input with icon
- Filter chips: Todas | Não lidas | Com oferta | Reservadas | Vendidas
- Each item: listing thumbnail, title, price, last message preview, date, badges (unread dot, offer pending badge, status chip)
- Empty state with illustration + CTAs "Explorar Marketplace" / "Publicar anúncio"
- Dark premium glass styling

### B) `ChatThread.tsx` (replaces MessageThread)
- **Header**: listing thumbnail + title + price + user avatar/name + dropdown menu (Ver perfil, Ver anúncio, Reportar, Bloquear)
- **Messages area**: 
  - Text bubbles (dark theme, gold accent for own)
  - System event cards for: offer sent/accepted/rejected/countered, listing reserved/sold
  - Offer cards with accept/reject/counter buttons inline (for seller)
- **Composer**: 
  - Text input + send button
  - Quick action buttons (contextual based on role + state): "Fazer Proposta", "Aceitar", "Recusar", "Reservar", "Marcar Vendido"
  - Image attachment button

### C) `DealPanel.tsx`
- **Product card**: main photo, title, price, location, condition, category, "Ver anúncio" link
- **Negotiation section**: listed price, last offer amount, quick offer chips (-5%, -10%, -15%), "Enviar proposta" button, timeline of offers with dates
- **Status section**: Available/Reserved/Sold badges with context (reserved for whom, sold date/price)
- **Trust section**: seller verified badge, rating stars, number of sales, anti-fraud warning

### D) `SystemMessage.tsx`
- Styled inline event cards for offer/status change events
- Icons: HandCoins (offer), CheckCircle (accepted), XCircle (rejected), Lock (reserved), ShoppingBag (sold)

## 4. Page Rewrite — `C2CMessages.tsx`

**Desktop (lg+):** 3-column grid layout
```
[ConversationList 320px] [ChatThread flex-1] [DealPanel 360px]
```

**Mobile (<lg):** 
- 3 tabs: Conversas | Chat | Produto
- DealPanel also accessible via bottom sheet from chat
- Auto-switch to Chat tab when conversation selected

**State management:**
- `selectedConversationId` drives chat + deal panel
- Load listing details + offers when conversation changes
- Realtime updates for messages and offers

## 5. Visual Identity

- `glass-premium` background on panels
- Gold accent (`hsl(43 96% 56%)`) for own messages, active states, offer amounts
- Dark borders with subtle glow
- Rounded cards with premium shadows
- Status badges: green (available), amber (reserved), red (sold)
- System messages: centered, muted, with icon + gold highlights for amounts

## Files to create/edit

| File | Action |
|------|--------|
| Migration SQL | Create — add columns + realtime |
| `src/hooks/useC2CMessages.ts` | Major refactor — expanded types, new mutations |
| `src/components/c2c/inbox/ConversationList.tsx` | Create |
| `src/components/c2c/inbox/ChatThread.tsx` | Create |
| `src/components/c2c/inbox/DealPanel.tsx` | Create |
| `src/components/c2c/inbox/SystemMessage.tsx` | Create |
| `src/pages/c2c/C2CMessages.tsx` | Full rewrite |

