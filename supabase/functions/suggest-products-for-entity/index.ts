import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntityContext {
  entityType: "lead" | "contact" | "company";
  entityId: string;
  workspaceId: string;
  // Entity basic data
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  industry?: string;
  // Instagram enrichment data
  instagramFollowers?: number;
  instagramPosts?: number;
  instagramBio?: string;
  instagramCategory?: string;
  instagramIsVerified?: boolean;
  instagramIsBusiness?: boolean;
  // AI analysis data
  inferredProfession?: string;
  inferredSpecialty?: string;
  inferredLocation?: string;
  leadScore?: number;
  // Manual notes/requirements
  notes?: string;
  requirements?: string;
  tags?: string[];
}

interface ProductInfo {
  id: string;
  name: string;
  category: string | null;
  product_type: string;
  short_description: string | null;
  base_price: number | null;
  billing_type: string;
}

interface ProductSuggestion {
  productId: string;
  matchScore: number;
  reason: string;
  suggestedApproach?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context } = await req.json() as { context: EntityContext };

    if (!context.workspaceId) {
      throw new Error("workspaceId is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products from the workspace
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, category, product_type, short_description, base_price, billing_type")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .limit(50);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      throw productsError;
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [], message: "Nenhum produto disponível no catálogo" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build rich context description
    const contextParts: string[] = [];

    // Basic info
    if (context.name) contextParts.push(`Nome: ${context.name}`);
    if (context.email) contextParts.push(`Email: ${context.email}`);
    if (context.source) contextParts.push(`Fonte: ${context.source}`);
    if (context.industry) contextParts.push(`Indústria: ${context.industry}`);

    // Instagram enrichment - very valuable for understanding the prospect
    if (context.instagramBio) {
      contextParts.push(`Bio Instagram: "${context.instagramBio}"`);
    }
    if (context.instagramCategory) {
      contextParts.push(`Categoria Instagram: ${context.instagramCategory}`);
    }
    if (context.instagramFollowers) {
      const size = context.instagramFollowers > 100000 ? "grande influenciador" :
                   context.instagramFollowers > 10000 ? "influenciador médio" :
                   context.instagramFollowers > 1000 ? "microinfluenciador" : "perfil pequeno";
      contextParts.push(`Seguidores: ${context.instagramFollowers.toLocaleString()} (${size})`);
    }
    if (context.instagramPosts) {
      const activity = context.instagramPosts > 500 ? "muito ativo" :
                       context.instagramPosts > 100 ? "ativo" : "pouco ativo";
      contextParts.push(`Publicações: ${context.instagramPosts} (${activity})`);
    }
    if (context.instagramIsBusiness) {
      contextParts.push("Conta profissional: Sim");
    }
    if (context.instagramIsVerified) {
      contextParts.push("Perfil verificado: Sim");
    }

    // AI analysis data
    if (context.inferredProfession) {
      contextParts.push(`Profissão: ${context.inferredProfession}`);
    }
    if (context.inferredSpecialty) {
      contextParts.push(`Especialidade: ${context.inferredSpecialty}`);
    }
    if (context.inferredLocation) {
      contextParts.push(`Localização: ${context.inferredLocation}`);
    }
    if (context.leadScore) {
      const quality = context.leadScore >= 75 ? "lead de alta qualidade" :
                      context.leadScore >= 50 ? "lead promissor" : "lead a qualificar";
      contextParts.push(`Lead Score: ${context.leadScore}/100 (${quality})`);
    }

    // Manual notes and requirements
    if (context.notes) {
      contextParts.push(`Notas: ${context.notes}`);
    }
    if (context.requirements) {
      contextParts.push(`Requisitos do cliente: ${context.requirements}`);
    }
    if (context.tags && context.tags.length > 0) {
      contextParts.push(`Tags: ${context.tags.join(", ")}`);
    }

    const contextDescription = contextParts.length > 0
      ? contextParts.join("\n")
      : "Sem informações adicionais disponíveis";

    // Build products catalog
    const productsCatalog = products.map((p: ProductInfo) =>
      `- ID: ${p.id} | Nome: "${p.name}" | Tipo: ${p.product_type} | Categoria: ${p.category || "Sem categoria"} | Preço: ${p.base_price ? `€${p.base_price}` : "Sob consulta"} | ${p.short_description || ""}`
    ).join("\n");

    const systemPrompt = `Você é um especialista em vendas B2B que analisa perfis de potenciais clientes e sugere os produtos/serviços mais adequados.

Contexto: Estamos a analisar um perfil de ${context.entityType === 'lead' ? 'lead' : context.entityType === 'contact' ? 'contacto' : 'empresa'} com dados enriquecidos do Instagram e análise IA.

Regras importantes:
1. Analise TODOS os dados disponíveis, especialmente a bio do Instagram e a especialidade detectada
2. Sugira no máximo 5 produtos que façam sentido para este perfil específico
3. Se houver seguidores altos, considere serviços de marketing/branding
4. Se for profissional de saúde, priorize serviços relacionados
5. Considere o tamanho do perfil (seguidores) para dimensionar as sugestões
6. Para cada sugestão, explique especificamente PORQUE é relevante para ESTE perfil
7. Adicione uma sugestão de abordagem comercial personalizada

Responda APENAS com um JSON válido:
{
  "suggestions": [
    {
      "productId": "uuid-do-produto",
      "matchScore": 85,
      "reason": "Razão específica baseada nos dados do perfil",
      "suggestedApproach": "Sugestão de como abordar este cliente sobre este produto"
    }
  ],
  "overallInsight": "Análise geral do potencial comercial deste perfil"
}`;

    const userPrompt = `Perfil do potencial cliente:

${contextDescription}

---

Catálogo de produtos disponíveis:
${productsCatalog}

Analise o perfil e sugira os produtos mais adequados, explicando especificamente porque cada um é relevante para ESTE perfil em particular.`;

    console.log("Sending request to AI gateway for entity suggestions...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log("AI response:", content);

    // Parse the JSON response
    let suggestions: ProductSuggestion[] = [];
    let overallInsight = "";

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
        overallInsight = parsed.overallInsight || "";
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
    }

    // Validate that productIds exist in our catalog
    const productIds = new Set(products.map((p: ProductInfo) => p.id));
    suggestions = suggestions.filter((s: ProductSuggestion) => productIds.has(s.productId));

    // Enrich suggestions with product details
    const enrichedSuggestions = suggestions.map((s: ProductSuggestion) => {
      const product = products.find((p: ProductInfo) => p.id === s.productId);
      return {
        ...s,
        product: product ? {
          id: product.id,
          name: product.name,
          category: product.category,
          product_type: product.product_type,
          base_price: product.base_price,
          short_description: product.short_description,
        } : null,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: enrichedSuggestions,
        overallInsight,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in suggest-products-for-entity:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
