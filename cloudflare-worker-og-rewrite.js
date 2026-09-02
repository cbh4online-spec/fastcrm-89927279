/**
 * Cloudflare Worker — OG Rewrite para Crawlers
 *
 * Intercepta crawlers de redes sociais em paths da loja/bio/landing
 * e redireciona para a edge function og-proxy que serve OG tags corretas.
 *
 * CONFIGURAÇÃO (painel Cloudflare → Workers & Pages → o Worker → Settings → Domains & Routes):
 * 1. Criar Worker no painel Cloudflare
 * 2. Colar este código e fazer Deploy da versão atual
 * 3. Associar EXATAMENTE a estas rotas (todas necessárias):
 *    - fastcrm.metodopare.ai/store/*
 *    - fastcrm.metodopare.ai/bio/*
 *    - fastcrm.metodopare.ai/p/*
 *    - fastcrm.metodopare.ai/c2c/*
 *    - fastcrm.metodopare.ai/marketplace/*
 *    - fastcrm.metodopare.ai/book/*
 *    - fastcrm.metodopare.ai/<workspace>/book/*   (páginas de marcação com workspace no caminho)
 *    - fastcrm.metodopare.ai/sitemap-dynamic.xml
 *
 * VERIFICAR SE A ROTA ESTÁ ATIVA (exemplo com uma página de marcação):
 *
 *   # 1) Direto à edge function — deve devolver o título/imagem da reunião
 *   curl -s -A "WhatsApp/2.0" \
 *     "https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/og-proxy?path=%2F{workspace}%2Fbook%2F{slug}" \
 *     | grep 'og:image'
 *
 *   # 2) Pelo domínio público — tem de devolver o MESMO resultado
 *   curl -s -A "WhatsApp/2.0" \
 *     "https://fastcrm.metodopare.ai/{workspace}/book/{slug}" | grep 'og:image'
 *
 * Se (1) mostra a imagem da reunião e (2) mostra a imagem genérica do FastCRM,
 * a rota `/<workspace>/book/*` não está associada ao Worker ou o Worker publicado está desatualizado.
 */

const OG_PROXY_BASE = "https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/og-proxy";
const SITEMAP_DYNAMIC_URL = "https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/sitemap-dynamic";

const CRAWLER_UA_REGEX = /facebookexternalhit|Facebot|facebook\.com|WhatsApp|Twitterbot|Slackbot|LinkedInBot|Discordbot|TelegramBot|Applebot|Pinterestbot|redditbot|vkShare|Viber|SkypeUriPreview|ia_archiver|Googlebot|bingbot|Baiduspider|YandexBot|GPTBot|ChatGPT-User|OAI-SearchBot|PerplexityBot|Perplexity-User|Claude-Web|ClaudeBot|anthropic-ai|Google-Extended|CCBot|Bytespider|Amazonbot/i;

// Páginas públicas de marcação: /book/{slug} e /{workspaceSlug}/book/{slug}
const BOOKING_PATH_REGEX = /^\/(?:[^/]+\/)?book\/[^/]+\/?$/;

const INTERCEPTED_PREFIXES = ["/store/", "/bio/", "/p/", "/c2c/", "/marketplace/"];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Sitemap dinâmico (rewrite transparente para edge function)
    if (pathname === "/sitemap-dynamic.xml") {
      return fetch(SITEMAP_DYNAMIC_URL, { headers: request.headers });
    }

    // Only intercept matching paths
    const shouldIntercept =
      INTERCEPTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
      BOOKING_PATH_REGEX.test(pathname);

    if (!shouldIntercept) {
      return fetch(request);
    }

    // Check if request is from a crawler
    const userAgent = request.headers.get("user-agent") || "";
    const isCrawler = CRAWLER_UA_REGEX.test(userAgent);

    if (!isCrawler) {
      return fetch(request);
    }

    // Redirect crawler to og-proxy with the original path
    const ogProxyUrl = `${OG_PROXY_BASE}?path=${encodeURIComponent(pathname)}`;
    return Response.redirect(ogProxyUrl, 302);
  },
};
