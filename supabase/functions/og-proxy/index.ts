import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://fastcrm.lovable.app";
const FALLBACK_IMAGE = `${BASE_URL}/og-image.png`;

// Static vertical SEO data
const VERTICAL_SEO: Record<string, { title: string; description: string }> = {
  clinicas: {
    title: "FastCRM para Clínicas — Sistema com IA para Gestão Clínica",
    description: "CRM com IA para clínicas: agendamento automático, follow-up inteligente e comunicação omnicanal. Aumente a retenção de pacientes.",
  },
  imobiliarias: {
    title: "FastCRM para Imobiliárias — Pipeline Inteligente com IA",
    description: "CRM para imobiliárias com pipeline visual, resposta automática a leads e IA para qualificação. Feche mais negócios.",
  },
  formacao: {
    title: "FastCRM para Formação — Gestão de Inscrições com IA",
    description: "CRM para centros de formação: pipeline de inscrições, nurturing automático e gestão de turmas com inteligência artificial.",
  },
  condominios: {
    title: "FastCRM para Condomínios — Gestão Inteligente com Portal",
    description: "CRM para gestão de condomínios: portal do condómino, cobranças automáticas e comunicação centralizada com IA.",
  },
  agencias: {
    title: "FastCRM para Agências — Pipeline e Rentabilidade com IA",
    description: "CRM para agências: pipeline de vendas, gestão de contas e análise de rentabilidade com inteligência artificial.",
  },
  empresas: {
    title: "FastCRM para Empresas — Infraestrutura Digital com IA",
    description: "CRM empresarial com IA: pipeline de vendas, automações, comunicação omnicanal e relatórios executivos numa única plataforma.",
  },
};

const CRAWLER_REGEX = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot|bot|crawl|spider/i;

function isCrawler(userAgent: string | null): boolean {
  return userAgent ? CRAWLER_REGEX.test(userAgent) : false;
}

function buildOgHtml(title: string, description: string, image: string, url: string): string {
  // Escape HTML entities
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="FastCRM"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(url)}"/>
<title>${esc(title)}</title>
</head>
<body>Redirecting...</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const slug = url.searchParams.get("slug") || "";
    const userAgent = req.headers.get("user-agent");

    if (!type || !slug) {
      return new Response("Missing type or slug", { status: 400, headers: corsHeaders });
    }

    let pageTitle = "FastCRM - CRM Inteligente";
    let pageDescription = "Plataforma de CRM inteligente para gestão de leads, oportunidades e relacionamento com clientes";
    let pageImage = FALLBACK_IMAGE;
    let pageUrl = BASE_URL;

    if (type === "vertical") {
      const seo = VERTICAL_SEO[slug];
      if (seo) {
        pageTitle = seo.title;
        pageDescription = seo.description;
      }
      pageUrl = `${BASE_URL}/${slug}`;
    } else {
      // Dynamic types need DB lookup
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      if (type === "bio") {
        // slug format: workspaceSlug/pageSlug
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, pageSlug] = parts;
          const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", wsSlug).single();
          if (ws) {
            const { data: page } = await supabase
              .from("bio_pages")
              .select("name, seo_title, seo_description, seo_image")
              .eq("workspace_id", ws.id)
              .eq("slug", pageSlug)
              .single();
            if (page) {
              pageTitle = page.seo_title || page.name || pageTitle;
              pageDescription = page.seo_description || pageDescription;
              if (page.seo_image) pageImage = page.seo_image;
            }
          }
          pageUrl = `${BASE_URL}/bio/${wsSlug}/${pageSlug}`;
        }
      } else if (type === "landing") {
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, pageSlug] = parts;
          const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", wsSlug).single();
          if (ws) {
            const { data: page } = await supabase
              .from("landing_pages")
              .select("title, headline, subheadline")
              .eq("workspace_id", ws.id)
              .eq("slug", pageSlug)
              .single();
            if (page) {
              pageTitle = page.title || page.headline || pageTitle;
              pageDescription = page.subheadline || pageDescription;
            }
          }
          pageUrl = `${BASE_URL}/p/${wsSlug}/${pageSlug}`;
        }
      } else if (type === "store") {
        const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", slug).single();
        if (ws) {
          const { data: store } = await supabase
            .from("workspace_store_settings")
            .select("store_name, store_description, logo_url")
            .eq("workspace_id", ws.id)
            .single();
          if (store) {
            pageTitle = store.store_name || pageTitle;
            pageDescription = store.store_description || pageDescription;
            if (store.logo_url) pageImage = store.logo_url;
          }
        }
        pageUrl = `${BASE_URL}/store/${slug}`;
      } else if (type === "product") {
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, productId] = parts;
          const { data: product } = await supabase
            .from("products")
            .select("name, description, image_url")
            .eq("id", productId)
            .single();
          if (product) {
            pageTitle = product.name || pageTitle;
            pageDescription = product.description || pageDescription;
            if (product.image_url) pageImage = product.image_url;
          }
          pageUrl = `${BASE_URL}/store/${wsSlug}/product/${productId}`;
        }
      }
    }

    // For crawlers: serve OG HTML
    if (isCrawler(userAgent)) {
      const html = buildOgHtml(pageTitle, pageDescription, pageImage, pageUrl);
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      });
    }

    // For real users: redirect
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: pageUrl },
    });
  } catch (error) {
    console.error("og-proxy error:", error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
