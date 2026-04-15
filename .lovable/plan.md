

# Plano: Corrigir Live — Chat, Produtos e Carrinho (sem Mux WHIP)

## Contexto
A transmissão de vídeo via câmara local do broadcaster já funciona no PC. O Mux WHIP **não será usado**. O foco é corrigir os 3 problemas restantes:

1. **Chat demo inconsistente** — cada dispositivo gera mensagens diferentes
2. **Produtos falsos** — `LiveProductShowcase` usa `DEMO_PRODUCTS` hardcoded
3. **Carrinho não funcional** — botão "Comprar" faz apenas `toast`, não adiciona ao carrinho real

---

## 1. Chat determinístico entre dispositivos

**Ficheiro:** `src/components/c2c/livestream/LiveChat.tsx`

- Substituir `Math.random()` por um PRNG seeded com o `livestreamId` (e.g. função simples de hash)
- Usar timestamps arredondados (e.g. a cada 3 segundos desde o início da live) como trigger, em vez de `setInterval` com delays aleatórios
- Resultado: todos os dispositivos geram exactamente as mesmas mensagens demo nos mesmos momentos

## 2. Produtos reais da BD

**Ficheiro:** `src/components/c2c/livestream/LiveProductShowcase.tsx`

- Quando `productIds` é fornecido e não vazio, buscar os produtos reais de `c2c_listings` por ID
- Mapear `c2c_listings` para a interface `FeaturedProduct` (title, price, photos[0], etc.)
- Manter `DEMO_PRODUCTS` como fallback apenas quando não existem `productIds`

## 3. Carrinho funcional + StoreCartProvider

**Ficheiros:**
- `src/App.tsx` — envolver a rota `/marketplace/:workspaceSlug/live/:id` no `StoreCartProvider`
- `src/components/c2c/livestream/LiveProductShowcase.tsx` — importar `useStoreCart` e chamar `addItem()` no botão "Comprar" com os dados reais do produto
- O carrinho lateral (drawer) abrirá automaticamente ao adicionar

## 4. Compatibilidade iOS (vídeo placeholder)

**Ficheiro:** `src/components/c2c/livestream/SimulatedVideoFeed.tsx`

- Adicionar `muted` e `playsInline` explícitos no elemento `<video>` do HLS player (já tem, mas confirmar que o Safari fallback também os tem)
- Nota: sem Mux WHIP, viewers continuarão a ver o placeholder animado enquanto não houver transmissão real — isto é esperado

---

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/App.tsx` | Envolver rota live em `StoreCartProvider` |
| `src/components/c2c/livestream/LiveChat.tsx` | PRNG seeded por `livestreamId` |
| `src/components/c2c/livestream/LiveProductShowcase.tsx` | Fetch `c2c_listings` + `useStoreCart().addItem()` |
| `src/components/c2c/livestream/SimulatedVideoFeed.tsx` | Confirmar atributos iOS no Safari fallback |

