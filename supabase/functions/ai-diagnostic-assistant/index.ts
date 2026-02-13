import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DiagnosticRequest {
  message: string;
  workspaceId: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  clientUserId?: string;
  companyId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, workspaceId, conversationHistory = [], clientUserId, companyId }: DiagnosticRequest = await req.json();

    if (!message || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "message and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Diagnostic assistant query: "${message}" in workspace ${workspaceId}`);

    // First, use AI to extract search keywords from the user's message
    const keywordResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Extrai palavras-chave de pesquisa da mensagem do utilizador.
Inclui: sinónimos, termos técnicos, abreviações comuns (CRM, ERP, etc).
Responde APENAS com palavras separadas por espaço, sem pontuação.
Exemplo: "preciso de ajuda com clientes" -> "clientes CRM gestão vendas relacionamento"`
          },
          { role: "user", content: message }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    let searchTerms = message;
    if (keywordResponse.ok) {
      const keywordData = await keywordResponse.json();
      const keywords = keywordData.choices?.[0]?.message?.content?.trim();
      if (keywords) {
        searchTerms = `${message} ${keywords}`;
        console.log(`Enhanced search terms: ${searchTerms}`);
      }
    }

    // Search for relevant products using text search
    const { data: products, error: searchError } = await supabase.rpc("match_products", {
      query_text: searchTerms,
      match_count: 5,
      filter_workspace_id: workspaceId,
    });

    if (searchError) {
      console.error("Product search error:", searchError);
    }

    // Build product context
    const productContext = (products || [])
      .map((p: any, i: number) => {
        return `[Produto ${i + 1}]
Nome: ${p.name}
SKU: ${p.sku || "N/A"}
Preço: ${p.base_price?.toFixed(2) || "N/A"}€
Categoria: ${p.category || "N/A"}
Descrição: ${p.short_description || "Sem descrição"}`;
      })
      .join("\n\n");

    // Fetch B2B context if client info provided
    let b2bContext = "";
    if (companyId) {
      const [ordersRes, contractsRes, ticketsRes, invoicesRes] = await Promise.all([
        supabase.from("order_notes").select("id, order_number, status, total_gross, created_at")
          .eq("company_id", companyId).order("created_at", { ascending: false }).limit(10),
        supabase.from("client_contracts").select("title, type, status, end_date, renewal_date")
          .eq("company_id", companyId).limit(10),
        supabase.from("client_tickets").select("subject, status, priority, type, created_at")
          .eq("company_id", companyId).order("created_at", { ascending: false }).limit(5),
        supabase.from("invoices").select("invoice_number, status, total_amount, due_date")
          .eq("company_id", companyId).order("created_at", { ascending: false }).limit(10),
      ]);

      const recentOrders = (ordersRes.data || []).map((o: any) =>
        `- ${o.order_number}: ${o.status}, ${o.total_gross?.toFixed(2)}€`).join("\n");
      const contracts = (contractsRes.data || []).map((c: any) =>
        `- ${c.title}: ${c.status}, expira ${c.end_date || "N/A"}`).join("\n");
      const tickets = (ticketsRes.data || []).map((t: any) =>
        `- ${t.subject}: ${t.status}, ${t.priority}`).join("\n");
      const invoices = (invoicesRes.data || []).map((inv: any) =>
        `- ${inv.invoice_number}: ${inv.status}, ${inv.total_amount?.toFixed(2)}€`).join("\n");

      b2bContext = `
CONTEXTO DA RELAÇÃO COMERCIAL DO CLIENTE:

Encomendas recentes:
${recentOrders || "Nenhuma"}

Contratos ativos:
${contracts || "Nenhum"}

Tickets de suporte:
${tickets || "Nenhum"}

Faturas recentes:
${invoices || "Nenhuma"}
`;
    }

    const systemPrompt = `Você é um copilot B2B especializado em produtos, serviços e relação comercial.
Ajuda clientes profissionais com: recomendações de produtos, estado de encomendas, contratos, faturação e suporte.

INSTRUÇÕES:
- Analise o pedido do cliente considerando todo o contexto da relação comercial
- Recomende produtos do catálogo quando aplicável
- Responda sobre encomendas, contratos, faturas ou tickets quando perguntado
- Sugira upgrades ou oportunidades quando relevante
- Seja conciso e profissional
- Responda sempre em português de Portugal
- Se não tiver informação suficiente, diga honestamente
${b2bContext}
PRODUTOS DISPONÍVEIS:
${productContext || "Nenhum produto encontrado no catálogo para esta pesquisa."}`;

    // Generate AI response
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.slice(-6),
          { role: "user", content: message },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de pedidos excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes. Por favor contacte o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await chatResponse.text();
      console.error("Chat API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices?.[0]?.message?.content || "Desculpe, não consegui processar o seu pedido.";

    // Format recommended products for display
    const recommendedProducts = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.base_price,
      category: p.category,
      description: p.short_description,
      imageUrl: p.images?.[p.primary_image_index ?? 0] || null,
      similarity: p.similarity,
    }));

    console.log(`Diagnostic response generated with ${recommendedProducts.length} products`);

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        products: recommendedProducts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Diagnostic assistant error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
