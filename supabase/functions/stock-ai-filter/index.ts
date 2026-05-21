// Stock AI Filter: converte texto livre em filtros estruturados para Stock Valorizado
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, categories = [], suppliers = [], brands = [] } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return json({ error: "prompt em falta" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const systemPrompt = `És um assistente que converte pedidos em linguagem natural (português de Portugal) em filtros estruturados para uma tabela de inventário valorizado.

Regras:
- Devolve SEMPRE um objecto via tool call "apply_stock_filters". Nunca devolvas texto.
- "search" é texto livre para procurar no NOME ou SKU do produto. Se o utilizador descrever um tipo/uso/funcionalidade (ex: "controlo de presença", "switch gigabit", "câmaras IP"), coloca palavras-chave relevantes em "search" — separadas por espaços. NÃO inventes categorias.
- "stock_state": "all" | "zero" | "low" (abaixo do mínimo) | "normal" | "excess" (>3x mínimo).
- "markup_band": "all" | "negative" | "low" (<15%) | "mid" (15-50%) | "high" (>50%).
- "cost_min", "cost_max", "sale_min", "sale_max": números em EUR para o VALOR de stock (stock × preço), ou null.
- "categories", "suppliers", "brands": arrays de strings, apenas usando valores EXACTOS das listas fornecidas. Vazio se não houver correspondência clara.
- Se o pedido for ambíguo, usa só "search".

Categorias disponíveis: ${categories.slice(0, 80).join(", ") || "(nenhuma)"}
Fornecedores disponíveis: ${suppliers.slice(0, 60).join(", ") || "(nenhum)"}
Marcas disponíveis: ${brands.slice(0, 60).join(", ") || "(nenhuma)"}`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "apply_stock_filters",
            description: "Aplica filtros estruturados à tabela de stock valorizado.",
            parameters: {
              type: "object",
              properties: {
                search: { type: "string", description: "Termo de pesquisa livre (nome/SKU/keywords)." },
                stock_state: { type: "string", enum: ["all", "zero", "low", "normal", "excess"] },
                markup_band: { type: "string", enum: ["all", "negative", "low", "mid", "high"] },
                cost_min: { type: ["number", "null"] },
                cost_max: { type: ["number", "null"] },
                sale_min: { type: ["number", "null"] },
                sale_max: { type: ["number", "null"] },
                categories: { type: "array", items: { type: "string" } },
                suppliers: { type: "array", items: { type: "string" } },
                brands: { type: "array", items: { type: "string" } },
                explanation: { type: "string", description: "Frase curta a explicar o filtro aplicado." },
              },
              required: ["search", "stock_state", "markup_band", "categories", "suppliers", "brands", "explanation"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "apply_stock_filters" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) return json({ error: "Limite de pedidos IA atingido. Tente novamente em instantes." }, 429);
    if (resp.status === 402) return json({ error: "Créditos IA esgotados. Adicione créditos à workspace." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return json({ error: "Falha ao processar pedido IA", fallback: true }, 200);
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) return json({ error: "Resposta IA inválida", fallback: true }, 200);

    let parsed: any;
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return json({ error: "JSON inválido da IA", fallback: true }, 200);
    }

    return json({ filters: parsed });
  } catch (e) {
    console.error("stock-ai-filter error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido", fallback: true }, 200);
  }
});
