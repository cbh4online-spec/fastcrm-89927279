import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { workspaceId, productIds, minConfidence = "medium" } = await req.json();

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get products without weight
    let query = supabase
      .from("products")
      .select("id, name, sku, category, description")
      .eq("workspace_id", workspaceId)
      .is("weight", null)
      .eq("status", "active")
      .limit(100);

    if (productIds?.length) {
      query = query.in("id", productIds);
    }

    const { data: products, error: prodErr } = await query;
    if (prodErr) throw prodErr;
    if (!products?.length) {
      return new Response(JSON.stringify({ success: true, data: { updated: 0, skipped: 0, results: [] } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confidenceLevels: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const minLevel = confidenceLevels[minConfidence] || 2;
    const results: any[] = [];
    let updated = 0;
    let skipped = 0;

    // Process in batches of 5 (with context grouping by category)
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      const batchPrompt = `Estime o peso (com embalagem, em kg) de cada produto abaixo.

${batch.map((p, idx) => `${idx + 1}. "${p.name}"${p.sku ? ` (SKU: ${p.sku})` : ""}${p.category ? ` [${p.category}]` : ""}${p.description ? ` — ${(p.description as string).substring(0, 100)}` : ""}`).join("\n")}

Responda APENAS em JSON válido, um array:
[
  { "index": 1, "weight_kg": 0.35, "confidence": "high|medium|low", "reasoning": "Breve explicação" },
  ...
]`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é um especialista em logística e produtos. Estime pesos reais com precisão. Responda apenas em JSON." },
            { role: "user", content: batchPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        console.error("AI error:", response.status, txt);
        // Skip this batch
        batch.forEach((p) => {
          results.push({ id: p.id, name: p.name, status: "error", error: `AI error: ${response.status}` });
          skipped++;
        });
        continue;
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let estimations: any[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        estimations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        batch.forEach((p) => {
          results.push({ id: p.id, name: p.name, status: "parse_error" });
          skipped++;
        });
        continue;
      }

      for (const est of estimations) {
        const idx = (est.index || 1) - 1;
        const product = batch[idx];
        if (!product) continue;

        const level = confidenceLevels[est.confidence] || 0;
        if (level >= minLevel && est.weight_kg > 0) {
          const { error: updateErr } = await supabase
            .from("products")
            .update({ weight: est.weight_kg })
            .eq("id", product.id);

          if (!updateErr) {
            results.push({ id: product.id, name: product.name, weight_kg: est.weight_kg, confidence: est.confidence, reasoning: est.reasoning, status: "updated" });
            updated++;
          } else {
            results.push({ id: product.id, name: product.name, status: "update_error" });
            skipped++;
          }
        } else {
          results.push({ id: product.id, name: product.name, weight_kg: est.weight_kg, confidence: est.confidence, reasoning: est.reasoning, status: "skipped_low_confidence" });
          skipped++;
        }
      }

      // Delay between batches
      if (i + batchSize < products.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return new Response(JSON.stringify({ success: true, data: { updated, skipped, total: products.length, results } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch weight estimation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
