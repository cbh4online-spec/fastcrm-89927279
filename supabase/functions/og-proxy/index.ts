import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://fastcrm.metodopare.ai";
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

/**
 * Parse a direct path like /store/{slug}/product/{id} into type+slug params.
 */
function parsePathToTypeSlug(path: string): { type: string; slug: string } | null {
  // /{wsSlug}/book/{pageSlug} or /book/{pageSlug}
  const bookingWithWs = path.match(/^\/([^/]+)\/book\/([^/?#]+)/);
  if (bookingWithWs && bookingWithWs[1] !== "book") {
    return { type: "booking", slug: `${bookingWithWs[1]}/${bookingWithWs[2]}` };
  }
  const bookingMatch = path.match(/^\/book\/([^/?#]+)/);
  if (bookingMatch) {
    return { type: "booking", slug: `-/${bookingMatch[1]}` };
  }
  // /store/{wsSlug}/product/{productId}
  const productMatch = path.match(/^\/store\/([^/]+)\/product\/([^/]+)/);
  if (productMatch) {
    return { type: "product", slug: `${productMatch[1]}/${productMatch[2]}` };
  }
  // /store/{wsSlug} (store homepage)
  const storeMatch = path.match(/^\/store\/([^/]+)\/?$/);
  if (storeMatch) {
    return { type: "store", slug: storeMatch[1] };
  }
  // /bio/{wsSlug}/{pageSlug}
  const bioMatch = path.match(/^\/bio\/([^/]+)\/([^/]+)/);
  if (bioMatch) {
    return { type: "bio", slug: `${bioMatch[1]}/${bioMatch[2]}` };
  }
  // /p/{wsSlug}/{pageSlug} (landing)
  const landingMatch = path.match(/^\/p\/([^/]+)\/([^/]+)/);
  if (landingMatch) {
    return { type: "landing", slug: `${landingMatch[1]}/${landingMatch[2]}` };
  }
  // /c2c/{wsSlug}/listing/{id}
  const c2cListingMatch = path.match(/^\/c2c\/([^/]+)\/listing\/([^/]+)/);
  if (c2cListingMatch) {
    return { type: "c2c-listing", slug: `${c2cListingMatch[1]}/${c2cListingMatch[2]}` };
  }
  // /marketplace/{wsSlug}/listing/{id}
  const marketplaceListingMatch = path.match(/^\/marketplace\/([^/]+)\/listing\/([^/]+)/);
  if (marketplaceListingMatch) {
    return { type: "c2c-listing", slug: `${marketplaceListingMatch[1]}/${marketplaceListingMatch[2]}` };
  }
  // /marketplace/{wsSlug}/seller/{id}
  const marketplaceSellerMatch = path.match(/^\/marketplace\/([^/]+)\/seller\/([^/]+)/);
  if (marketplaceSellerMatch) {
    return { type: "c2c-seller", slug: `${marketplaceSellerMatch[1]}/${marketplaceSellerMatch[2]}` };
  }
  // /marketplace/{wsSlug}/{listingId} (direct ID without /listing/ prefix)
  const marketplaceDirectListingMatch = path.match(/^\/marketplace\/([^/]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
  if (marketplaceDirectListingMatch) {
    return { type: "c2c-listing", slug: `${marketplaceDirectListingMatch[1]}/${marketplaceDirectListingMatch[2]}` };
  }
  // /marketplace/{wsSlug}
  const marketplaceMatch = path.match(/^\/marketplace\/([^/]+)\/?$/);
  if (marketplaceMatch) {
    return { type: "c2c", slug: marketplaceMatch[1] };
  }
  // /c2c/{wsSlug}/seller/{id}
  const c2cSellerMatch = path.match(/^\/c2c\/([^/]+)\/seller\/([^/]+)/);
  if (c2cSellerMatch) {
    return { type: "c2c-seller", slug: `${c2cSellerMatch[1]}/${c2cSellerMatch[2]}` };
  }
  // /c2c/{wsSlug}
  const c2cMatch = path.match(/^\/c2c\/([^/]+)\/?$/);
  if (c2cMatch) {
    return { type: "c2c", slug: c2cMatch[1] };
  }
  return null;
}

/**
 * Convert Supabase Storage object URLs to the render/image endpoint
 * so crawlers get JPEG (Facebook doesn't support AVIF/WebP).
 */
function toFacebookSafeImage(imageUrl: string): string {
  if (!imageUrl.includes("/storage/v1/object/public/")) return imageUrl;
  // /storage/v1/object/public/... → /storage/v1/render/image/public/...
  // The render endpoint auto-converts to JPEG
  const transformed = imageUrl
    .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}width=1200`;
}

function buildOgHtml(title: string, description: string, image: string, url: string, extra = "", ogType = "website"): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeImage = toFacebookSafeImage(image);
  // Tipo declarado tem de coincidir com o formato real do ficheiro
  const imagePath = safeImage.split("?")[0].toLowerCase();
  const imageType = imagePath.endsWith(".png")
    ? "image/png"
    : imagePath.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(safeImage)}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:type" content="${esc(ogType)}"/>
<meta property="og:site_name" content="FastCRM"/>
${extra}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(safeImage)}"/>
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
    let type = url.searchParams.get("type") || "";
    let slug = url.searchParams.get("slug") || "";
    const userAgent = req.headers.get("user-agent");

    // Support ?path= for direct URL resolution (e.g. /store/slug/product/id)
    const pathParam = url.searchParams.get("path") || "";
    if (!type && pathParam) {
      const parsed = parsePathToTypeSlug(pathParam);
      if (parsed) {
        type = parsed.type;
        slug = parsed.slug;
      }
    }

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

      if (type === "booking") {
        // Página pública de marcação — slug: "{wsSlug|-}/{pageSlug}"
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, pageSlug] = parts;
          let wsId: string | null = null;
          if (wsSlug && wsSlug !== "-") {
            const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", wsSlug).maybeSingle();
            if (ws) wsId = ws.id;
          }
          let bookingQuery = supabase
            .from("booking_pages")
            .select("title, description, duration_minutes, share_image_url, seo_title, seo_description, workspace_id")
            .eq("slug", pageSlug)
            .eq("is_active", true);
          if (wsId) bookingQuery = bookingQuery.eq("workspace_id", wsId);
          const { data: bookingPage } = await bookingQuery.limit(1).maybeSingle();

          if (bookingPage) {
            pageTitle = bookingPage.seo_title || bookingPage.title || pageTitle;
            const durationNote = bookingPage.duration_minutes ? `${bookingPage.duration_minutes} min · ` : "";
            const rawDesc =
              bookingPage.seo_description ||
              bookingPage.description ||
              "Escolhe o melhor horário e confirma a tua marcação online.";
            const composed = `${durationNote}${rawDesc}`;
            pageDescription = composed.length > 200 ? `${composed.slice(0, 197)}...` : composed;

            if (bookingPage.share_image_url) {
              pageImage = bookingPage.share_image_url;
            } else {
              // Fallback: identidade visual do workspace
              const { data: store } = await supabase
                .from("store_settings")
                .select("banner_url, logo_url")
                .eq("workspace_id", bookingPage.workspace_id)
                .maybeSingle();
              if (store?.banner_url || store?.logo_url) {
                pageImage = store.banner_url || store.logo_url;
              }
            }
          }

          pageUrl =
            wsSlug && wsSlug !== "-"
              ? `${BASE_URL}/${wsSlug}/book/${pageSlug}`
              : `${BASE_URL}/book/${pageSlug}`;

          if (isCrawler(userAgent)) {
            const extra = `<meta property="og:image:height" content="630"/>`;
            const html = buildOgHtml(pageTitle, pageDescription, pageImage, pageUrl, extra);
            return new Response(html, {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" },
            });
          }
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, Location: pageUrl },
          });
        }
      } else if (type === "bio") {
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
        // Resolve workspace: try workspaces.slug first, then store_settings.store_slug
        let wsId: string | null = null;
        let wsName: string | null = null;
        const { data: ws } = await supabase.from("workspaces").select("id, name").eq("slug", slug).maybeSingle();
        if (ws) {
          wsId = ws.id;
          wsName = ws.name;
        } else {
          const { data: ss } = await supabase.from("store_settings").select("workspace_id, store_name").eq("store_slug", slug).maybeSingle();
          if (ss) {
            wsId = ss.workspace_id;
            wsName = ss.store_name;
          }
        }
        if (wsId) {
          const { data: store } = await supabase
            .from("store_settings")
            .select("store_name, store_description, logo_url, banner_url")
            .eq("workspace_id", wsId)
            .single();
          if (store) {
            pageTitle = store.store_name || wsName || pageTitle;
            pageDescription = store.store_description || `Explore os produtos e serviços de ${store.store_name || wsName}`;
            pageImage = store.banner_url || store.logo_url || pageImage;
          }
        }
        pageUrl = `${BASE_URL}/store/${slug}`;
        // Serve store-specific OG with wider dimensions for banner
        if (isCrawler(req.headers.get("user-agent"))) {
          const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const imgW = pageImage.includes("banner") ? "1200" : "800";
          const imgH = pageImage.includes("banner") ? "630" : "800";
          const extra = `<meta property="og:image:width" content="${imgW}"/>\n<meta property="og:image:height" content="${imgH}"/>`;
          const html = buildOgHtml(pageTitle, pageDescription, pageImage, pageUrl, extra);
          return new Response(html, {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
          });
        }
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, Location: pageUrl },
        });
      } else if (type === "product") {
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, productId] = parts;
          const { data: product } = await supabase
            .from("products")
            .select("name, short_description, images, base_price, currency, category")
            .eq("id", productId)
            .single();
          if (product) {
            pageTitle = product.name || pageTitle;
            pageDescription = product.short_description || pageDescription;
            // Resolve image: try images array first, then product_images table
            const imgArr = product.images as string[] | null;
            if (imgArr && imgArr.length > 0) {
              pageImage = imgArr[0];
            } else {
              // Fallback to product_images table
              const { data: piRows } = await supabase
                .from("product_images")
                .select("url")
                .eq("product_id", productId)
                .order("position", { ascending: true })
                .limit(1);
              if (piRows && piRows.length > 0 && piRows[0].url) {
                pageImage = piRows[0].url;
              }
            }
            // Build extra product meta tags
            const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const price = product.base_price ? Number(product.base_price).toFixed(2) : null;
            const currency = product.currency || "EUR";
            let extraTags = `<meta property="og:image:width" content="800"/>\n<meta property="og:image:height" content="800"/>`;
            if (price) {
              extraTags += `\n<meta property="product:price:amount" content="${esc(price)}"/>`;
              extraTags += `\n<meta property="product:price:currency" content="${esc(currency)}"/>`;
            }
            if ((product as any).brand) extraTags += `\n<meta property="product:brand" content="${esc((product as any).brand)}"/>`;
            if (product.category) extraTags += `\n<meta property="product:category" content="${esc(product.category)}"/>`;
            // Store extra tags for later use
            (product as any)._extraOgTags = extraTags;
          }
          pageUrl = `${BASE_URL}/store/${wsSlug}/product/${productId}`;
          // Save product ref for HTML build
          if (product && (product as any)._extraOgTags) {
            const extraTags = (product as any)._extraOgTags;
            // For crawlers: serve product-specific OG HTML
            if (isCrawler(req.headers.get("user-agent"))) {
              const html = buildOgHtml(pageTitle, pageDescription, pageImage, pageUrl, extraTags, "product");
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
          }
        }
      } else if (type === "c2c") {
        // C2C Marketplace — slug is workspace slug (e.g. "metodopare")
        const { data: ws } = await supabase.from("workspaces").select("id, name").eq("slug", slug).single();
        let mktBaseUrl = BASE_URL;
        if (ws) {
          const { data: mktCfg } = await supabase
            .from("c2c_marketplace_config")
            .select("custom_domain")
            .eq("workspace_id", ws.id)
            .maybeSingle();
          if (mktCfg?.custom_domain) mktBaseUrl = `https://${mktCfg.custom_domain}`;

          const { data: store } = await supabase
            .from("store_settings")
            .select("store_name, store_description, logo_url")
            .eq("workspace_id", ws.id)
            .maybeSingle();
          const storeName = store?.store_name || ws.name;
          pageTitle = `${storeName} — Marketplace C2C`;
          pageDescription = store?.store_description || `Explora o marketplace de ${storeName}. Compra e vende entre utilizadores reais com segurança.`;
          if (store?.logo_url) pageImage = store.logo_url;
        }
        pageUrl = `${mktBaseUrl}/marketplace/${slug}`;
      } else if (type === "c2c-seller") {
        // C2C Seller Profile — slug format: "workspaceSlug/sellerId"
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, sellerId] = parts;
          // Resolve custom domain
          let mktBaseUrl = BASE_URL;
          const { data: wsForDomain } = await supabase.from("workspaces").select("id").eq("slug", wsSlug).maybeSingle();
          if (wsForDomain) {
            const { data: mktCfg } = await supabase
              .from("c2c_marketplace_config")
              .select("custom_domain")
              .eq("workspace_id", wsForDomain.id)
              .maybeSingle();
            if (mktCfg?.custom_domain) mktBaseUrl = `https://${mktCfg.custom_domain}`;
          }
          // Detect if sellerId is UUID or slug
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(sellerId);
          let sellerQuery = supabase
            .from("c2c_sellers")
            .select("display_name, bio, avatar_url, id")
            .eq("status", "approved");
          if (isUuid) {
            sellerQuery = sellerQuery.eq("user_id", sellerId);
          } else {
            sellerQuery = sellerQuery.eq("slug", sellerId);
          }
          const { data: seller } = await sellerQuery.maybeSingle();
          if (seller) {
            // Enrich with listing count
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
          pageUrl = `${mktBaseUrl}/marketplace/${wsSlug}/seller/${sellerId}`;
        }
      } else if (type === "c2c-listing") {
        // C2C Listing — slug format: "workspaceSlug/listingId"
        const parts = slug.split("/");
        if (parts.length === 2) {
          const [wsSlug, listingId] = parts;
          // Resolve custom domain
          let mktBaseUrl = BASE_URL;
          const { data: wsForDomain } = await supabase.from("workspaces").select("id").eq("slug", wsSlug).maybeSingle();
          if (wsForDomain) {
            const { data: mktCfg } = await supabase
              .from("c2c_marketplace_config")
              .select("custom_domain")
              .eq("workspace_id", wsForDomain.id)
              .maybeSingle();
            if (mktCfg?.custom_domain) mktBaseUrl = `https://${mktCfg.custom_domain}`;
          }
          const { data: listing } = await supabase
            .from("c2c_listings")
            .select("title, description, price, photos")
            .eq("id", listingId)
            .maybeSingle();
          if (listing) {
            const priceStr = listing.price ? ` — ${Number(listing.price).toFixed(2)}€` : "";
            pageTitle = `${listing.title || "Anúncio"}${priceStr}`;
            const rawDesc = listing.description || `Vê este anúncio no marketplace C2C.`;
            pageDescription = rawDesc.length > 160 ? rawDesc.slice(0, 157) + "..." : rawDesc;
            const photos = listing.photos as string[] | null;
            if (photos && photos.length > 0) pageImage = photos[0];
          }
          pageUrl = `${mktBaseUrl}/marketplace/${wsSlug}/${listingId}`;

          // Early return for crawlers with product-specific OG
          if (isCrawler(userAgent)) {
            const esc2 = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            let extraTags = `<meta property="og:image:width" content="800"/>\n<meta property="og:image:height" content="800"/>`;
            if (listing?.price) {
              extraTags += `\n<meta property="product:price:amount" content="${esc2(Number(listing.price).toFixed(2))}"/>`;
              extraTags += `\n<meta property="product:price:currency" content="EUR"/>`;
            }
            const html = buildOgHtml(pageTitle, pageDescription, pageImage, pageUrl, extraTags, "product");
            return new Response(html, {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
            });
          }
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, Location: pageUrl },
          });
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
