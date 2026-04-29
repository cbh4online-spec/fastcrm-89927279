// Gera conteúdo comercial e argumentário para um produto a partir de
// dados extraídos por OCR + ficha técnica editada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ANIMAL_TERMS = [
  "cão","cao","cachorro","cães","caes","gato","gata","gatos","gatas","pet","pets",
  "animal","animais","veterinário","veterinaria","veterinária","canino","felino",
  "hamster","coelho","papagaio","periquito","peixe","peixes","aquário","aquario",
  "ração","racao","petshop","pet shop","pet-shop",
];
function sanitize(text: string | null | undefined): string {
  if (!text) return text ?? "";
  let c = text;
  for (const t of ANIMAL_TERMS) c = c.replace(new RegExp(`\\b${t}\\b`, "gi"), "");
  return c.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}
function sanitizeAll<T>(o: T): T {
  if (typeof o === "string") return sanitize(o) as unknown as T;
  if (Array.isArray(o)) return o.map(sanitizeAll) as unknown as T;
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) out[k] = sanitizeAll(v);
    return out as T;
  }
  return o;
}

const SYSTEM_PROMPT = `És copywriter sénior de cosmética e beleza, a escrever em português de Portugal.

Recebes a ficha técnica de um produto e geras conteúdo comercial completo: títulos, descrições, SEO, scripts de venda, FAQs, objeções e argumentário.

REGRAS:
1. NUNCA inventes características que não estão na ficha. Se faltar, escreve "Pendente de validação".
2. NUNCA referências a animais (cães, gatos, pets, veterinária, etc.). Omite por completo.
3. Sem promessas médicas/terapêuticas absolutas.
4. Tom profissional, claro, comercial, seguro. Evita superlativos vazios.
5. Distinguir argumentos sensoriais e olfativos como argumentos comerciais sugeridos.
6. Sugestões de venda cruzada e kit ficam sempre marcadas como "pending_validation".

Devolve APENAS JSON válido com este formato:
{
  "content": {
    "short_title": "",
    "seo_title": "",
    "short_description": "",
    "long_description": "",
    "benefits": [],
    "usage_instructions": "",
    "precautions": "",
    "meta_description": "",
    "seo_keywords": [],
    "catalog_text": "",
    "proposal_text": "",
    "whatsapp_text": "",
    "in_store_text": "",
    "sensory_experience": "",
    "olfactory_experience": "",
    "tags": []
  },
  "sales_support": {
    "positioning": "",
    "ideal_customer": "",
    "sales_arguments": [],
    "sensory_arguments": [],
    "olfactory_arguments": [],
    "how_to_explain": "",
    "faqs": [{"question": "", "answer": ""}],
    "objections": [{"objection": "", "response": ""}],
    "sales_alerts": [],
    "do_not_sell_as": [],
    "sell_as": [],
    "counter_script": "",
    "whatsapp_script": "",
    "in_store_script": "",
    "sales_team_script": "",
    "internal_notes": ""
  }
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY não configurada", fallback: true }, 200);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado", fallback: true }, 200);

    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabaseUser.auth.getUser();
    if (!userRes?.user) return json({ error: "Sessão inválida", fallback: true }, 200);

    const body = await req.json().catch(() => ({}));
    const { product_data } = body as { product_data?: Record<string, unknown> };
    if (!product_data) return json({ error: "product_data obrigatório", fallback: true }, 200);

    const userPrompt = `Ficha técnica do produto:\n\n${JSON.stringify(product_data, null, 2)}\n\nGera o conteúdo comercial e argumentário completo conforme as regras.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status;
      let msg = "Erro ao gerar conteúdo";
      if (status === 429) msg = "Limite de pedidos atingido. Tenta novamente daqui a uns minutos.";
      else if (status === 402) msg = "Créditos AI esgotados. Adiciona créditos no workspace.";
      console.error("AI error:", status, errText);
      return json({ error: msg, status, fallback: true }, 200);
    }

    const data = await aiResp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const cleaned = sanitizeAll(parsed);

    return json({ success: true, generated: cleaned });
  } catch (e) {
    console.error("generate-content error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido", fallback: true }, 200);
  }
});
