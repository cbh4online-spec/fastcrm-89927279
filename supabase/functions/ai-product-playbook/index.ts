import { logAIUsage } from "../_shared/ai-instrumentation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Section = "script" | "objections" | "warranty" | "all";

interface Body {
  workspaceId?: string;
  workspace_id?: string;
  product: {
    name: string;
    category?: string | null;
    description?: string | null;
    short_description?: string | null;
    base_price?: number | null;
    currency?: string | null;
    product_type?: string | null;
    sku?: string | null;
  };
  section?: Section; // default 'all'
  language?: string; // default 'pt-PT'
  existing?: {
    script?: string;
    objections?: Array<{ objection: string; response: string }>;
    warranty?: string;
  };
}

const FALLBACK = {
  script: "",
  objections: [] as Array<{ objection: string; response: string }>,
  warranty: "",
};

function safeJson(s: string): unknown {
  try {
    // Strip code fences if present
    const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to find first {...}
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const workspaceId = body.workspaceId ?? body.workspace_id;
    const product = body.product;
    const section: Section = body.section ?? "all";
    const language = body.language ?? "pt-PT";

    if (!product?.name) {
      return new Response(
        JSON.stringify({ error: "product.name é obrigatório", fallback: FALLBACK }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured", fallback: FALLBACK }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ctx = [
      `Nome: ${product.name}`,
      product.category ? `Categoria: ${product.category}` : null,
      product.product_type ? `Tipo: ${product.product_type}` : null,
      product.sku ? `SKU: ${product.sku}` : null,
      product.base_price != null
        ? `Preço: ${product.base_price} ${product.currency ?? "EUR"}`
        : null,
      product.short_description ? `Resumo: ${product.short_description}` : null,
      product.description ? `Descrição: ${product.description}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const sectionInstruction =
      section === "script"
        ? `Gera APENAS o campo "script" (deixa "objections" como array vazio e "warranty" como string vazia).`
        : section === "objections"
        ? `Gera APENAS o campo "objections" (deixa "script" e "warranty" como strings vazias).`
        : section === "warranty"
        ? `Gera APENAS o campo "warranty" (deixa "script" como string vazia e "objections" como array vazio).`
        : `Gera todos os três campos.`;

    const existingHint = body.existing
      ? `\n\nConteúdo atual (melhora-o, não o repitas literalmente):\n${JSON.stringify(body.existing).slice(0, 4000)}`
      : "";

    const systemPrompt = `És um especialista sénior em vendas consultivas e atendimento ao cliente em Portugal (${language}). Crias procedimentos comerciais e de pós-venda concretos, práticos, sem clichés. Tom profissional, direto e em português de Portugal. NUNCA inventas factos sobre o produto que não estejam no contexto. Quando faltar informação, mantém-te genérico mas útil.`;

    const userPrompt = `Cria um procedimento comercial e de pós-venda para o seguinte produto:

${ctx}

Devolves estritamente um objeto JSON com esta forma:
{
  "script": "string em markdown com o script de vendas (abertura, descoberta de necessidade, argumentos, prova social, apresentação de preço, fecho). Usa títulos e listas.",
  "objections": [
    { "objection": "objeção curta do cliente", "response": "resposta validada e prática" }
  ],
  "warranty": "string em markdown com a política de reclamação e garantia: prazos, canais de contacto, fluxo (receção → diagnóstico → resolução), responsabilidades."
}

Regras:
- Mínimo 5 e máximo 10 objeções relevantes (preço, confiança, timing, comparação, risco, suporte).
- "script" deve ter entre 200 e 800 palavras.
- "warranty" deve ter entre 100 e 400 palavras, alinhada com a legislação de consumo portuguesa quando aplicável.
- ${sectionInstruction}
- Responde APENAS com o JSON, sem texto antes ou depois, sem code fences.${existingHint}`;

    const t0 = Date.now();
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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text().catch(() => "");
      console.error("ai-product-playbook upstream error", status, text);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "Muitos pedidos, tenta novamente em instantes.", fallback: FALLBACK }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "credits_exhausted", message: "Sem créditos de IA suficientes.", fallback: FALLBACK }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "internal_error", fallback: FALLBACK }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = safeJson(raw) as any;

    const result = {
      script: typeof parsed?.script === "string" ? parsed.script : "",
      objections: Array.isArray(parsed?.objections)
        ? parsed.objections
            .filter((o: any) => o && typeof o === "object")
            .map((o: any) => ({
              objection: String(o.objection ?? "").slice(0, 500),
              response: String(o.response ?? "").slice(0, 2000),
            }))
            .slice(0, 50)
        : [],
      warranty: typeof parsed?.warranty === "string" ? parsed.warranty : "",
    };

    if (workspaceId) {
      try {
        logAIUsage({
          workspace_id: workspaceId,
          feature: "ai-product-playbook",
          model: "google/gemini-3-flash-preview",
          tokens_input: data?.usage?.prompt_tokens ?? 0,
          tokens_output: data?.usage?.completion_tokens ?? 0,
          latency_ms: Date.now() - t0,
        });
      } catch (_e) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ ok: true, section, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-product-playbook fatal", e);
    return new Response(
      JSON.stringify({ error: "internal_error", message: e instanceof Error ? e.message : String(e), fallback: FALLBACK }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
