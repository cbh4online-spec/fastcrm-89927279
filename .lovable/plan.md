

## Regra de Rewrite para Crawlers no Domínio

### Problema
O `og-proxy` já funciona e serve OG tags corretas, mas só é acionado pelos botões de partilha internos (`getShareUrl()`). Quando um utilizador cola o URL direto da barra de endereço (ex: `fastcrm.metodopare.ai/store/simplesedivertido/product/...`) no Facebook, o crawler recebe o `index.html` genérico com a imagem do banner FastCRM.

### Solução: Cloudflare Worker

Como o domínio `fastcrm.metodopare.ai` é custom, a única forma de interceptar crawlers **antes** de chegarem à SPA é ao nível do proxy/CDN. Se o domínio usa Cloudflare (ou similar), criamos um **Worker** que:

1. Deteta se o user-agent é crawler (Facebook, WhatsApp, Twitter, etc.)
2. Se o path começa com `/store/`, `/bio/`, `/p/`, `/c2c/` → redireciona para `og-proxy?path={path_original}`
3. Se é utilizador real → deixa passar normalmente para a SPA

### Implementação

**Ficheiro a criar: Cloudflare Worker** (configurado externamente no painel Cloudflare)

```text
Fluxo:
  Crawler + /store/slug/product/id
    → 302 redirect para og-proxy?path=/store/slug/product/id
    → og-proxy serve HTML com OG tags corretas

  Utilizador real + /store/slug/product/id
    → passa direto para a SPA (comportamento normal)
```

O Worker terá:
- Lista de user-agents de crawlers (mesma regex já usada no `og-proxy`)
- Padrões de path a interceptar: `/store/`, `/bio/`, `/p/`, `/c2c/`
- Redirect 302 para `https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/og-proxy?path={pathname}`
- Tráfego normal: `fetch(request)` sem alteração

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `cloudflare-worker-og-rewrite.js` | **Criar** na raiz do projeto — script pronto a copiar para Cloudflare Workers |

### Configuração necessária (externa ao Lovable)

1. Aceder ao painel Cloudflare do domínio `fastcrm.metodopare.ai`
2. Criar um Worker com o código gerado
3. Associar o Worker à rota `fastcrm.metodopare.ai/store/*`, `fastcrm.metodopare.ai/bio/*`, `fastcrm.metodopare.ai/c2c/*`, `fastcrm.metodopare.ai/p/*`

### Limitação

Este ficheiro é **referência** — tem de ser configurado manualmente no Cloudflare (ou proxy equivalente). Não é possível automatizar esta configuração a partir do Lovable.

### Critérios de aceitação

- Worker redireciona crawlers para `og-proxy?path=...` com status 302
- Utilizadores reais acedem à SPA sem qualquer impacto
- Ao partilhar `fastcrm.metodopare.ai/store/simplesedivertido/product/{id}` no Facebook, aparece a imagem do produto

