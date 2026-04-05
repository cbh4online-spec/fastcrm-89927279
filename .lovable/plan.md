

# Associar Cookies, Consent e Eventos ao Analytics da Loja

## Diagnóstico

Existem **3 sistemas isolados** que precisam de ser ligados:

1. **Visitor Tracking** (`useStoreVisitorTracking` + `StoreProductViewTracker`) — grava sessões e page views na DB (`store_visitor_sessions`, `store_page_views`), mas ignora o estado de consent GDPR
2. **GDPR Consent** (`useConsent` + `gdpr_consents`) — gere cookies e preferências do visitante, mas não alimenta o analytics da loja
3. **GTM/dataLayer Events** (`useTracking` + `safePush`) — emite eventos para GTM/GA4, mas estes dados não aparecem no dashboard da loja

O dashboard "Visitas" mostra dados de sessões e page views mas não tem:
- Estado de consent por sessão (analytics granted/denied)
- Eventos de interacção (add_to_cart, checkout, CTA clicks)
- Correlação cookie consent ↔ sessão

## Solução

### 1. Enriquecer `store_visitor_sessions` com dados de consent

**Migração SQL**: Adicionar colunas `consent_analytics`, `consent_marketing` e `gdpr_visitor_id` à tabela `store_visitor_sessions`.

### 2. Criar tabela `store_tracking_events` para eventos granulares

Nova tabela para registar eventos de interacção na loja (add_to_cart, remove_from_cart, checkout_started, cta_click, wishlist_add, etc.) ligados à sessão do visitante.

```text
store_tracking_events
├── id (uuid PK)
├── workspace_id (FK)
├── session_id (text) ← liga a store_visitor_sessions
├── event_type (text) — ex: add_to_cart, checkout_started, cta_click
├── event_data (jsonb) — metadata do evento (product_id, value, etc.)
├── page_url (text)
├── created_at (timestamptz)
└── RLS: workspace members can SELECT
```

### 3. Modificar `useStoreVisitorTracking` para respeitar consent e gravar estado

- Importar `useConsent` e passar `consent_analytics`, `consent_marketing`, `gdpr_visitor_id` no upsert da sessão
- Só registar tracking se `consent.analytics === true` ou `consent.necessary === true` (sessões básicas são "necessary")
- Expor função `trackStoreEvent(eventType, eventData)` para componentes da loja usarem

### 4. Instrumentar eventos na loja

Adicionar chamadas `trackStoreEvent` nos pontos-chave:
- `useStoreCartStore` → `add_to_cart`, `remove_from_cart`, `cart_update`
- Checkout flow → `checkout_started`, `checkout_completed`
- `StoreProductPage` → `product_view`, `cta_click`

### 5. Nova secção no StoreVisitsTab — "Eventos & Conversões"

Adicionar ao dashboard:
- Card com breakdown de consent (% analytics granted vs denied)
- Tabela/gráfico de eventos por tipo (add_to_cart, checkout, etc.)
- Funil de conversão baseado em eventos reais

## Ficheiros a modificar/criar

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar — adicionar colunas a `store_visitor_sessions` + criar `store_tracking_events` |
| `src/hooks/useStoreVisitorTracking.ts` | Modificar — integrar consent state, expor `trackStoreEvent` |
| `src/components/store/StoreVisitorTracker.tsx` | Modificar — passar consent props |
| `src/hooks/useStoreVisitsAnalytics.ts` | Modificar — agregar dados de eventos e consent |
| `src/components/store/analytics/StoreVisitsTab.tsx` | Modificar — adicionar secções de eventos e consent |
| `src/stores/useStoreCartStore.ts` | Modificar — emitir eventos add_to_cart/remove_from_cart |

## Segurança

- RLS na `store_tracking_events`: SELECT para workspace members, INSERT público (visitantes anónimos)
- Dados de consent nunca incluem PII — apenas flags boolean
- `event_data` sanitizado — sem campos pessoais

