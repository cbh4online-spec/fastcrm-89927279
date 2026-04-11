

## Correção: Imagem do produto não aparece na partilha de anúncios C2C

### Diagnóstico

Existem **3 bugs** que causam o problema:

1. **Coluna errada no og-proxy** — A edge function `og-proxy` faz `SELECT title, description, price, images` da tabela `c2c_listings`, mas a coluna real chama-se `photos` (não `images`). Resultado: retorna `null` e usa a imagem genérica do site.

2. **Rotas `/marketplace/` não reconhecidas** — A função `parsePathToTypeSlug` só trata paths `/c2c/...` mas o URL real de partilha é `/marketplace/{slug}/listing/{id}`. Quando o Cloudflare Worker redireciona com `?path=/marketplace/...`, o og-proxy não o consegue mapear.

3. **Cloudflare Worker não intercepta `/marketplace/`** — O worker só intercepta `/store/`, `/bio/`, `/p/`, `/c2c/`. Falta `/marketplace/`.

### Correção

**Ficheiro: `supabase/functions/og-proxy/index.ts`**
- Linha 338: mudar `.select("title, description, price, images")` → `.select("title, description, price, photos")`
- Linhas 345-346: mudar referências de `listing.images` → `listing.photos`
- Adicionar parsing de `/marketplace/{slug}/listing/{id}` em `parsePathToTypeSlug` → mapear para `type: "c2c-listing"`

**Ficheiro: `cloudflare-worker-og-rewrite.js`**
- Adicionar `"/marketplace/"` ao array `INTERCEPTED_PREFIXES`

### Impacto
- Crawlers (WhatsApp, Facebook, etc.) passam a receber a imagem real do produto
- Zero impacto em funcionalidades existentes
- Correção imediata após deploy

