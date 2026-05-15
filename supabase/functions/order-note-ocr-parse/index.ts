// Edge function: recebe uma imagem (base64) de uma nota de encomenda
// (folha manuscrita, fotografia de pedido, talão) e devolve linhas
// estruturadas (produto, qtd, preço unitário, IVA) prontas a inserir
// numa nota de encomenda.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `És um assistente especializado em ler notas de encomenda (manuscritas, impressas ou fotografadas) em português de Portugal e devolver dados estruturados.

Recebes UMA imagem ou PDF que contém uma encomenda de cliente B2B/B2C. Pode ter cabeçalho (cliente, data, NIF) e uma lista de produtos com colunas tipo: referência/SKU, designação, quantidade, preço unitário, IVA, total.

REGRAS CRÍTICAS:
1. NUNCA inventes informação. Se um campo não existir, devolve null.
2. Quantidades são inteiros >= 1 (excepto se claramente fraccionário).
3. Preços em euros, com ponto decimal. Se a imagem usar vírgula, converte para ponto.
4. Se houver duas colunas de preço (líquido e c/IVA), assume "unit_price_net" como o preço SEM IVA. Se só houver um preço, devolve-o em "unit_price_net" e marca "price_includes_vat" se for evidente que inclui IVA.
5. Taxa de IVA padrão em Portugal: 23 (normal), 13 (intermédia), 6 (reduzida). Se não estiver indicada, devolve null e o sistema aplicará 23.
6. Linhas não-produto (totais, subtotais, observações) NÃO devem aparecer em "items".
7. Linguagem: português de Portugal.

Devolve APENAS um JSON válido (sem markdown, sem comentários), com este formato exacto:
{
  "header": {
    "client_name": null,
    "client_tax_id": null,
    "client_email": null,
    "order_date": null,
    "order_reference": null,
    "supplier_name": null,
    "notes": null
  },
  "items": [
    {
      "sku": null,
      "product_name": "Nome do produto",
      "quantity": 1,
      "unit_price_net": null,
      "vat_rate": null,
      "price_includes_vat": false,
      "line_total": null,
      "notes": null,
      "confidence": "high"
    }
  ],
  "totals": {
    "net": null,
    "vat": null,
    "gross": null
  },
  "overall_confidence": 0.0,
  "warnings": []
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY não configurada", fallback: true });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado", fallback: true });

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabaseUser.auth.getUser();
    if (!userRes?.user) return json({ error: "Sessão inválida", fallback: true });

    const body = await req.json().catch(() => ({}));
    const { image_base64, mime, file_name } = body as {
      image_base64?: string;
      mime?: string;
      file_name?: string;
    };

    if (!image_base64 || !mime) {
      return json({ error: "image_base64 e mime são obrigatórios", fallback: true });
    }
    if (!mime.startsWith("image/") && mime !== "application/pdf") {
      return json({ error: `Tipo de ficheiro não suportado: ${mime}`, fallback: true });
    }
    // sanity check (~10MB base64)
    if (image_base64.length > 14_000_000) {
      return json({ error: "Ficheiro demasiado grande (máx ~10MB)", fallback: true });
    }

    const parts: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: "Analisa esta nota de encomenda e devolve o JSON estruturado conforme as regras. Lê com atenção colunas, totais e quantidades manuscritas.",
      },
    ];

    if (mime.startsWith("image/")) {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${image_base64}` },
      });
    } else {
      parts.push({
        type: "file",
        file: {
          filename: file_name ?? "encomenda.pdf",
          file_data: `data:application/pdf;base64,${image_base64}`,
        },
      });
    }

    const aiModel = "google/gemini-2.5-flash";
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: parts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      const status = aiResponse.status;
      let userMsg = "Erro ao processar com IA";
      if (status === 429) userMsg = "Limite de pedidos atingido. Tenta novamente daqui a uns minutos.";
      else if (status === 402) userMsg = "Limite temporário da IA atingido. Tenta novamente daqui a pouco.";
      console.error("[order-note-ocr-parse] AI error", status, errText.slice(0, 300));
      return json({ error: userMsg, status, fallback: true });
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    if (!parsed) {
      console.error("[order-note-ocr-parse] JSON inválido. Preview:", content.slice(0, 300));
      return json({
        error: "A IA devolveu uma resposta inválida. Tenta novamente com uma imagem mais nítida.",
        code: "invalid_ai_response",
        fallback: true,
      });
    }

    // Normalização defensiva
    const items = Array.isArray((parsed as any).items) ? (parsed as any).items : [];
    const cleanItems = items
      .filter((it: any) => it && (it.product_name || it.sku))
      .map((it: any) => ({
        sku: it.sku ?? null,
        product_name: String(it.product_name ?? "").trim(),
        quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
        unit_price_net: it.unit_price_net != null ? Math.max(0, Number(it.unit_price_net)) : null,
        vat_rate: it.vat_rate != null ? Math.max(0, Math.min(100, Number(it.vat_rate))) : null,
        price_includes_vat: !!it.price_includes_vat,
        line_total: it.line_total != null ? Number(it.line_total) : null,
        notes: it.notes ?? null,
        confidence: it.confidence ?? "medium",
      }));

    return json({
      success: true,
      header: (parsed as any).header ?? {},
      items: cleanItems,
      totals: (parsed as any).totals ?? {},
      overall_confidence: Number((parsed as any).overall_confidence ?? 0),
      warnings: Array.isArray((parsed as any).warnings) ? (parsed as any).warnings : [],
    });
  } catch (e) {
    console.error("[order-note-ocr-parse] error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido", fallback: true });
  }
});
