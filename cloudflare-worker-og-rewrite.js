/**
 * Cloudflare Worker — OG Rewrite para Crawlers
 *
 * Intercepta crawlers de redes sociais em paths da loja/bio/landing
 * e redireciona para a edge function og-proxy que serve OG tags corretas.
 *
 * CONFIGURAÇÃO:
 * 1. Criar Worker no painel Cloudflare
 * 2. Colar este código
 * 3. Associar às rotas:
 *    - fastcrm.metodopare.ai/store/*
 *    - fastcrm.metodopare.ai/bio/*
 *    - fastcrm.metodopare.ai/p/*
 *    - fastcrm.metodopare.ai/c2c/*
 */

const OG_PROXY_BASE = "https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/og-proxy";

const CRAWLER_UA_REGEX = /facebookexternalhit|Facebot|facebook\.com|WhatsApp|Twitterbot|Slackbot|LinkedInBot|Discordbot|TelegramBot|Applebot|Pinterestbot|redditbot|vkShare|Viber|SkypeUriPreview|ia_archiver|Googlebot|bingbot|Baiduspider|YandexBot/i;

const INTERCEPTED_PREFIXES = ["/store/", "/bio/", "/p/", "/c2c/"];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Only intercept matching paths
    const shouldIntercept = INTERCEPTED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

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
