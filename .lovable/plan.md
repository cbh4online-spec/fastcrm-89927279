

# Plano: Corrigir OG metadata para perfil de vendedor no Marketplace

## Problema
Quando se partilha o link de um vendedor (ex: `/marketplace/metodopare/seller/jorge-cardoso-fbdc`) no WhatsApp/Facebook, aparece a imagem genérica do FastCRM em vez de informação específica do vendedor. Isto acontece por dois motivos:

1. **Lookup errado**: O og-proxy procura o vendedor por `user_id` (UUID), mas o URL usa um **slug** textual (ex: `jorge-cardoso-fbdc`). A query nunca encontra resultados, caindo no fallback genérico.
2. **Sem imagem do vendedor**: Mesmo que encontrasse, o og-proxy não busca o `avatar_url` do vendedor — usa sempre o fallback genérico.

## Alterações

### `supabase/functions/og-proxy/index.ts` — secção `c2c-seller` (linhas 351-367)

Corrigir a lógica de lookup para:
1. Detectar se o `sellerId` é UUID ou slug (mesmo padrão usado no frontend)
2. Fazer query por `slug` quando não é UUID, por `user_id` quando é UUID
3. Buscar também `avatar_url` e contar listings ativos para enriquecer a descrição
4. Usar `avatar_url` como `pageImage` quando disponível
5. Definir `pageUrl` com `/marketplace/` em vez de `/c2c/`

**De:**
```typescript
const { data: seller } = await supabase
  .from("c2c_sellers")
  .select("display_name, bio")
  .eq("user_id", sellerId)
  .eq("status", "approved")
  .maybeSingle();
```

**Para:**
```typescript
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(sellerId);
let query = supabase
  .from("c2c_sellers")
  .select("display_name, bio, avatar_url, id")
  .eq("status", "approved");
if (isUuid) {
  query = query.eq("user_id", sellerId);
} else {
  query = query.eq("slug", sellerId);
}
const { data: seller } = await query.maybeSingle();

// Enrich with listing count
if (seller) {
  const { count } = await supabase
    .from("c2c_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", seller.id)
    .eq("status", "active");
  
  pageTitle = `${seller.display_name || "Vendedor"} — Marketplace`;
  const listingNote = count ? ` ${count} anúncios disponíveis.` : "";
  pageDescription = seller.bio 
    ? `${seller.bio}${listingNote}` 
    : `Vê o perfil e os anúncios de ${seller.display_name || "este vendedor"}.${listingNote}`;
  if (seller.avatar_url) pageImage = seller.avatar_url;
}
pageUrl = `${BASE_URL}/marketplace/${wsSlug}/seller/${sellerId}`;
```

### Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `supabase/functions/og-proxy/index.ts` | Corrigir lookup slug/UUID, adicionar avatar_url e contagem de listings |

Nenhuma alteração de base de dados necessária — a coluna `slug` e `avatar_url` já existem na tabela `c2c_sellers`.

