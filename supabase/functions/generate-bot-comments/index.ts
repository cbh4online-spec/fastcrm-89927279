import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job
    const { data: job, error: jobErr } = await supabase
      .from("bot_comment_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", job.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update job to processing
    await supabase.from("bot_comment_jobs").update({ status: "processing" }).eq("id", jobId);

    // Fetch product info
    const { data: product } = await supabase
      .from("products")
      .select("id, name, description, category, brand, base_price, sku")
      .eq("id", job.product_id)
      .single();

    if (!product) {
      await supabase.from("bot_comment_jobs").update({ status: "failed", error_message: "Produto não encontrado" }).eq("id", jobId);
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch bot profiles
    const { data: profiles } = await supabase
      .from("bot_review_profiles")
      .select("*")
      .eq("workspace_id", job.workspace_id)
      .eq("is_active", true);

    const botProfiles = profiles && profiles.length > 0 ? profiles : [
      { id: null, display_name: "Cliente Satisfeito", persona_prompt: "Cliente satisfeito e profissional" },
      { id: null, display_name: "Técnico Especialista", persona_prompt: "Técnico que conhece bem o produto" },
      { id: null, display_name: "Comprador Frequente", persona_prompt: "Comprador habitual que compara produtos" },
    ];

    const contentType = job.content_type || "both";
    const reviewsCount = contentType === "qa" ? 0 : (job.reviews_count || 3);
    const qaCount = contentType === "reviews" ? 0 : (job.qa_count || 2);

    const systemPrompt = `És um gerador de conteúdo para uma loja online portuguesa. Gera comentários realistas, variados e credíveis em português de Portugal.

REGRAS:
- Cada review deve ter um tom diferente (satisfeito, neutro-positivo, entusiasta, técnico, prático)
- Ratings entre 3 e 5 estrelas (maioria 4-5)
- Títulos curtos e naturais
- Comentários entre 30-150 palavras
- Perguntas devem ser dúvidas reais que um comprador teria
- Respostas devem ser úteis e profissionais
- NUNCA mencionar que são gerados por IA
- Variar o estilo de escrita entre cada comentário`;

    const userPrompt = `Produto: ${product.name}
Descrição: ${product.description || "N/A"}
Categoria: ${product.category || "N/A"}
Marca: ${product.brand || "N/A"}
Preço: €${product.base_price}

Perfis disponíveis: ${botProfiles.map(p => p.display_name).join(", ")}

Gera exactamente:
${reviewsCount > 0 ? `- ${reviewsCount} reviews (com rating 3-5, título e comentário)` : ""}
${qaCount > 0 ? `- ${qaCount} pares pergunta/resposta` : ""}`;

    // Call AI via tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "submit_comments",
              description: "Submit generated reviews and Q&A for a product",
              parameters: {
                type: "object",
                properties: {
                  reviews: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        comment: { type: "string" },
                        rating: { type: "number", minimum: 3, maximum: 5 },
                        reviewer_name: { type: "string" },
                      },
                      required: ["title", "comment", "rating", "reviewer_name"],
                    },
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                        asker_name: { type: "string" },
                      },
                      required: ["question", "answer", "asker_name"],
                    },
                  },
                },
                required: ["reviews", "questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_comments" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await supabase.from("bot_comment_jobs").update({ status: "failed", error_message: "Rate limit excedido" }).eq("id", jobId);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("bot_comment_jobs").update({ status: "failed", error_message: "Créditos esgotados" }).eq("id", jobId);
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("bot_comment_jobs").update({ status: "failed", error_message: errText.slice(0, 500) }).eq("id", jobId);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase.from("bot_comment_jobs").update({ status: "failed", error_message: "AI não retornou dados estruturados" }).eq("id", jobId);
      throw new Error("No tool call in AI response");
    }

    const generated = JSON.parse(toolCall.function.arguments);
    const reviews = generated.reviews || [];
    const questions = generated.questions || [];

    // Insert reviews as bot-generated, unapproved
    let reviewsInserted = 0;
    for (const review of reviews) {
      const randomProfile = botProfiles[Math.floor(Math.random() * botProfiles.length)];
      const { error: revErr } = await supabase.from("store_reviews").insert({
        workspace_id: job.workspace_id,
        product_id: product.id,
        user_id: user.id,
        rating: Math.min(5, Math.max(1, review.rating)),
        title: review.title,
        comment: review.comment,
        source: "bot",
        bot_profile_id: randomProfile.id || null,
        reviewer_name: review.reviewer_name,
        is_approved: false,
      });
      if (!revErr) reviewsInserted++;
    }

    // Insert Q&A
    let qaInserted = 0;
    for (const qa of questions) {
      const randomProfile = botProfiles[Math.floor(Math.random() * botProfiles.length)];
      const { error: qaErr } = await supabase.from("product_qa").insert({
        workspace_id: job.workspace_id,
        product_id: product.id,
        question: qa.question,
        answer: qa.answer,
        source: "bot",
        bot_profile_id: randomProfile.id || null,
        asker_name: qa.asker_name,
        is_approved: false,
      });
      if (!qaErr) qaInserted++;
    }

    // Update job as completed
    await supabase.from("bot_comment_jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result_json: { reviews_generated: reviewsInserted, qa_generated: qaInserted },
    }).eq("id", jobId);

    return new Response(JSON.stringify({
      success: true,
      reviews_generated: reviewsInserted,
      qa_generated: qaInserted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-bot-comments error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
