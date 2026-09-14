/**
 * ai-commerce-autofill
 *
 * Gera sugestões de conteúdo AI Commerce (título, descrições, público-alvo,
 * casos de uso, funcionalidades, FAQ, palavras-chave, SEO) a partir dos dados
 * REAIS do produto. Nunca inventa preços, stock, GTIN/MPN nem promessas legais.
 *
 * Segurança: usa o JWT do utilizador (RLS) para ler o produto — se o produto não
 * pertencer a um workspace do utilizador, a leitura falha e responde 404.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-instrumentation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SCHEMA_TYPES = ["Product", "SoftwareApplication", "Service", "Course"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const { productId, baseUrl } = await req.json().catch(() => ({}));
    if (!productId || !UUID.test(String(productId))) return json({ error: "invalid_product" }, 400);

    const safeBaseUrl = typeof baseUrl === "string" && /^https:\/\/[a-z0-9.-]+(\/)?$/i.test(baseUrl.trim())
      ? baseUrl.trim().replace(/\/+$/, "")
      : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return json({ error: "unauthorized" }, 401);

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id, workspace_id, name, sku, brand, category, subcategory, product_type, short_description, commercial_description, base_price, currency, stock_status, main_benefits, benefits, features, target_audience, problem_solved, use_cases, seo_title, seo_description, store_slug, schema_type, canonical_url, checkout_url, languages, countries",
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) return json({ error: "not_found" }, 404);

    // Publicação externa: URLs derivadas da loja real (nunca inventadas).
    let workspaceSlug: string | null = null;
    if (product.workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("slug")
        .eq("id", product.workspace_id)
        .maybeSingle();
      workspaceSlug = (ws?.slug as string | null) ?? null;
    }

    const storeSlug = (product.store_slug as string | null) ?? null;
    const canonicalUrl =
      safeBaseUrl && workspaceSlug && storeSlug
        ? `${safeBaseUrl}/store/${workspaceSlug}/product/${storeSlug}`
        : "";
    const checkoutUrl =
      safeBaseUrl && workspaceSlug ? `${safeBaseUrl}/store/${workspaceSlug}/checkout` : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "ai_not_configured" }, 500);

    const facts = {
      nome: product.name,
      sku: product.sku,
      marca: product.brand,
      categoria: product.category,
      subcategoria: product.subcategory,
      tipo: product.product_type,
      descricao_curta: product.short_description,
      descricao_comercial: product.commercial_description,
      beneficios: product.main_benefits ?? product.benefits ?? null,
      funcionalidades: product.features ?? null,
      publico_alvo: product.target_audience,
      problema: product.problem_solved,
      casos_uso: product.use_cases,
      seo_title: product.seo_title,
      seo_description: product.seo_description,
    };

    const systemPrompt = `És especialista em conteúdo de e-commerce para motores de IA e agentes de compra, em português de Portugal.
Regras rígidas:
- Usa APENAS os factos fornecidos e conhecimento genérico e seguro sobre a categoria do produto.
- NUNCA inventes preços, stock, prazos de entrega, garantias, certificações, GTIN, MPN, marcas ou números concretos.
- Se não houver informação suficiente para um campo, devolve string vazia ou lista vazia.
- Tom claro, factual, sem exageros de marketing.
Responde APENAS com JSON válido:
{"ai_title":"","ai_category":"","ai_short_description":"","ai_long_description":"","ai_target_audience":"","ai_problem_solved":"","ai_use_cases":[],"ai_key_features":[],"ai_keywords":[],"ai_recommendation_context":"","ai_exclusions":"","ai_faq":[{"question":"","answer":""}],"seo_title":"","seo_description":"","main_benefits":[],"schema_type":""}
Limites: ai_title <=150 car., ai_short_description <=300 car., ai_long_description entre 250 e 1200 car., seo_title <=60 car., seo_description <=155 car., 3 a 6 casos de uso, 3 a 8 funcionalidades, 5 a 12 palavras-chave, 3 a 5 perguntas de FAQ, 3 a 6 benefícios (frases curtas, orientadas a resultado, sem números inventados).
schema_type: escolhe exatamente um de "Product", "SoftwareApplication", "Service", "Course" conforme a natureza do produto; se houver dúvida usa "Product".`;

    const start = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados reais do produto (JSON):\n${JSON.stringify(facts, null, 2)}` },
        ],
      }),
    });

    const workspaceId = product.workspace_id as string | null;

    if (!response.ok) {
      if (workspaceId) {
        logAIUsage({
          workspace_id: workspaceId,
          feature: "ai-commerce-autofill",
          model: "google/gemini-3-flash-preview",
          tokens_input: 0,
          tokens_output: 0,
          latency_ms: Date.now() - start,
          was_error: true,
          error_type: `http_${response.status}`,
        });
      }
      if (response.status === 429) return json({ error: "rate_limited" }, 429);
      if (response.status === 402) return json({ error: "no_credits" }, 402);
      return json({ error: "ai_error" }, 502);
    }

    const aiData = await response.json();
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature: "ai-commerce-autofill",
        model: "google/gemini-3-flash-preview",
        tokens_input: aiData?.usage?.prompt_tokens ?? 0,
        tokens_output: aiData?.usage?.completion_tokens ?? 0,
        latency_ms: Date.now() - start,
        was_error: false,
      });
    }

    const content: string = aiData?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "invalid_ai_response" }, 502);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return json({ error: "invalid_ai_response" }, 502);
    }

    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const list = (v: unknown, max: number, maxLen = 200) =>
      Array.isArray(v)
        ? v.filter((i) => typeof i === "string" && i.trim()).slice(0, max).map((i) => (i as string).trim().slice(0, maxLen))
        : [];

    const faq = Array.isArray(parsed.ai_faq)
      ? (parsed.ai_faq as unknown[])
          .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
          .map((e) => ({ question: str(e.question, 250), answer: str(e.answer, 1500) }))
          .filter((e) => e.question && e.answer)
          .slice(0, 5)
      : [];

    return json({
      suggestion: {
        ai_title: str(parsed.ai_title, 150),
        ai_category: str(parsed.ai_category, 120),
        ai_short_description: str(parsed.ai_short_description, 400),
        ai_long_description: str(parsed.ai_long_description, 5000),
        ai_target_audience: str(parsed.ai_target_audience, 800),
        ai_problem_solved: str(parsed.ai_problem_solved, 800),
        ai_use_cases: list(parsed.ai_use_cases, 6),
        ai_key_features: list(parsed.ai_key_features, 8),
        ai_keywords: list(parsed.ai_keywords, 12, 60),
        ai_recommendation_context: str(parsed.ai_recommendation_context, 1500),
        ai_exclusions: str(parsed.ai_exclusions, 1000),
        ai_faq: faq,
        seo_title: str(parsed.seo_title, 60),
        seo_description: str(parsed.seo_description, 160),
        main_benefits: list(parsed.main_benefits, 6, 180),
        schema_type: SCHEMA_TYPES.includes(str(parsed.schema_type, 40)) ? str(parsed.schema_type, 40) : "Product",
        // Derivados de dados reais da loja — não gerados pelo modelo.
        canonical_url: canonicalUrl,
        checkout_url: checkoutUrl,
        languages: ["pt"],
        countries: ["PT"],
      },
    });
  } catch (error) {
    console.error("ai-commerce-autofill error:", error instanceof Error ? error.message : error);
    return json({ error: "internal_error" }, 500);
  }
});
