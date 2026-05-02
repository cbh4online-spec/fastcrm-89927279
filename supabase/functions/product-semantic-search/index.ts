import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  query: string;
  workspaceId: string;
  limit?: number;
  /** Set to false para desligar a expansão por IA (debug). */
  expand?: boolean;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Pede ao modelo (Gemini Flash) para devolver até 6 sinónimos/keywords
 * relevantes em PT-PT que ajudem a encontrar o produto. Tool calling para
 * garantir formato JSON estável.
 */
async function expandQueryWithAI(query: string): Promise<string[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return [];

  try {
    const resp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "És um motor de busca de catálogo B2B em português europeu. Dada uma query do utilizador, devolves keywords e sinónimos curtos (1-3 palavras) que possam aparecer em nomes ou descrições de produtos relacionados. Inclui termos técnicos, marcas comuns e variações. Não inventes produtos.",
          },
          { role: "user", content: `Query: "${query}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "expand_keywords",
              description: "Devolve uma lista de keywords/sinónimos PT-PT.",
              parameters: {
                type: "object",
                properties: {
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 6,
                  },
                },
                required: ["keywords"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "expand_keywords" } },
      }),
    });

    if (!resp.ok) {
      console.warn(`[semantic-search] AI expand failed: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return [];
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    const kws: string[] = Array.isArray(parsed?.keywords) ? parsed.keywords : [];
    return kws.map((k) => String(k).trim()).filter(Boolean).slice(0, 6);
  } catch (err) {
    console.warn("[semantic-search] AI expand error:", err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SearchRequest = await req.json();
    const query = (body.query || "").trim();
    const workspaceId = body.workspaceId;
    const limit = Math.min(Math.max(body.limit ?? 10, 1), 25);
    const allowExpansion = body.expand !== false;

    if (!query || !workspaceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "query and workspaceId are required",
          products: [],
          count: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // AI Gate (não bloqueia em caso de falha do gate)
    try {
      const gate = await aiGate(workspaceId, "low", "product-semantic-search");
      if (!gate.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "quota_exceeded",
            upgrade_required: true,
            products: [],
            count: 0,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (gateErr) {
      console.warn("[semantic-search] aiGate failed, continuing:", gateErr);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const runMatch = async (q: string) => {
      const { data, error } = await supabase.rpc("match_products", {
        query_text: q,
        match_count: limit,
        filter_workspace_id: workspaceId,
      });
      if (error) {
        console.error("[semantic-search] match_products error:", error);
        return [];
      }
      return data || [];
    };

    // 1. Pesquisa direta
    let products = await runMatch(query);
    let expandedFrom: string[] = [];

    // 2. Expansão por IA quando não há resultados
    if (products.length === 0 && allowExpansion && query.length >= 3) {
      const keywords = await expandQueryWithAI(query);
      expandedFrom = keywords;

      if (keywords.length > 0) {
        const seen = new Map<string, any>();
        for (const kw of keywords) {
          const rows = await runMatch(kw);
          for (const row of rows) {
            if (!seen.has(row.id)) {
              seen.set(row.id, {
                ...row,
                // Penaliza ligeiramente resultados expandidos
                similarity: Math.max(0.1, (row.similarity ?? 0) * 0.7),
              });
            }
          }
          if (seen.size >= limit) break;
        }
        products = Array.from(seen.values())
          .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
          .slice(0, limit);
      }
    }

    console.log(
      `[semantic-search] query="${query}" results=${products.length} expanded=${expandedFrom.length > 0}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        query,
        products,
        count: products.length,
        expanded: expandedFrom.length > 0,
        keywords_used: expandedFrom,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[semantic-search] fatal:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        products: [],
        count: 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
