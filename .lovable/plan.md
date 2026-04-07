

## Diagnóstico

Analisando o screenshot do WhatsApp (IMG_0416), identifico dois problemas distintos:

1. **URL directa em vez de og-proxy** — A mensagem de produto partilhada no WhatsApp contém o URL directo (`https://fastcrm.metodopare.ai/store/simplesedivertido/product/...`) em vez do URL do og-proxy. Como a app é uma SPA (Single Page Application), o crawler do WhatsApp recebe apenas o `index.html` genérico com os meta tags "FastCRM com Método PARE" e o logo do site — nunca vê os meta tags específicos do produto (imagem, título, preço).

2. **OG image genérica expirada** — O `og:image` no `index.html` usa um URL assinado do Google Storage com `Expires=1774642344` (≈ março 2026), que já expirou. Mesmo para partilhas genéricas do site, a imagem não carrega.

O `og-proxy` edge function **já funciona correctamente** — serve OG tags com a imagem do produto quando detecta um crawler. O problema é que os URLs partilhados no WhatsApp não passam pelo og-proxy.

## Plano de Implementação

### 1. Corrigir OG image expirada no index.html
**Ficheiro:** `index.html`
- Substituir o URL assinado (expirado) do `og:image` por um URL permanente (ex: `/og-image.png` hospedado no public folder ou um URL de storage público sem expiração)

### 2. Garantir que mensagens automatizadas usam og-proxy URLs
**Ficheiros a verificar/corrigir:**
- `supabase/functions/process-product-alerts/index.ts` — usa URL directo `https://fastcrm.lovable.app/store/...` em vez de og-proxy
- `supabase/functions/_shared/whatsapp-autopilot.ts` — se o AI autopilot sugere links de produto, deve usar og-proxy
- Qualquer outra edge function que gere URLs de produto para envio via canais de mensagem

### 3. Adicionar fallback no og-proxy para domínio custom
**Ficheiro:** `supabase/functions/og-proxy/index.ts`
- O `BASE_URL` já é `https://fastcrm.metodopare.ai` — verificar que o redirect funciona correctamente
- Confirmar que `isCrawler` detecta o user-agent do WhatsApp (já incluído no regex: `WhatsApp`)

### 4. Verificar acessibilidade das imagens de produto
- As imagens de produto em storage devem ser públicas para que o crawler do WhatsApp consiga descarregá-las
- Se estão em buckets privados, o WhatsApp não consegue renderizar o `og:image`

## Critérios de Aceitação
- Link de produto partilhado no WhatsApp mostra preview com imagem, título e preço do produto
- OG image genérica do site funciona (URL não expirado)
- Todas as edge functions que geram URLs de produto para mensagens usam og-proxy
- Imagens de produto acessíveis publicamente para crawlers

