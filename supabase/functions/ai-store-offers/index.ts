import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!membership) throw new Error("No workspace");
    const workspaceId = membership.workspace_id;

    // Fetch top contacts with purchase history
    const { data: orders } = await supabase
      .from("store_orders")
      .select("contact_id, customer_email, customer_name, total, status, items, created_at")
      .eq("workspace_id", workspaceId)
      .in("status", ["paid", "processing", "shipped", "delivered"])
      .order("created_at", { ascending: false })
      .limit(200);

    // Group by contact
    const contactMap = new Map<string, {
      contact_id: string | null;
      email: string;
      name: string | null;
      totalSpent: number;
      orderCount: number;
      lastOrder: string;
      productNames: string[];
    }>();

    for (const order of orders || []) {
      const key = order.contact_id || order.customer_email;
      const existing = contactMap.get(key);
      const items = (order.items as any[]) || [];
      const names = items.map((i: any) => i.name);

      if (existing) {
        existing.totalSpent += order.total || 0;
        existing.orderCount += 1;
        existing.productNames.push(...names);
        if (order.created_at > existing.lastOrder) existing.lastOrder = order.created_at;
      } else {
        contactMap.set(key, {
          contact_id: order.contact_id,
          email: order.customer_email,
          name: order.customer_name,
          totalSpent: order.total || 0,
          orderCount: 1,
          lastOrder: order.created_at,
          productNames: names,
        });
      }
    }

    // Fetch products for cross-sell suggestions
    const { data: products } = await supabase
      .from("products")
      .select("id, name, base_price, category")
      .eq("workspace_id", workspaceId)
      .eq("store_published", true)
      .eq("status", "active")
      .limit(50);

    // Generate AI offers using Gemini
    const topContacts = Array.from(contactMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20);

    if (topContacts.length === 0) {
      return new Response(JSON.stringify({ offers: 0, message: "Sem dados de clientes suficientes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Analisa os seguintes clientes de uma loja online e gera ofertas personalizadas para cada um.
Para cada cliente, sugere a melhor oferta com base no comportamento de compra.

Clientes:
${topContacts.map(c => `- ${c.name || c.email}: ${c.orderCount} encomendas, €${c.totalSpent.toFixed(2)} gasto, últimos produtos: ${[...new Set(c.productNames)].slice(0, 5).join(", ")}`).join("\n")}

Produtos disponíveis:
${(products || []).map(p => `- ${p.name} (€${p.base_price}, ${p.category || "sem categoria"})`).join("\n")}

Responde APENAS em JSON válido com este formato:
[
  {
    "customer_email": "email",
    "title": "título da oferta",
    "description": "descrição curta",
    "offer_type": "discount|cross_sell|upsell|retention|bundle",
    "reasoning": "explicação do porquê",
    "confidence": 0.85,
    "discount_percentage": 10,
    "suggested_products": ["nome do produto"],
    "delivery_channel": "store|email"
  }
]

Máximo 10 ofertas. Foca em:
1. Cross-sell: produtos complementares baseados no histórico
2. Retenção: clientes que não compram há muito tempo
3. Upsell: clientes com ticket baixo que podem gastar mais
4. Bundle: clientes que compram frequentemente`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") || "",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      // Fallback: generate simple rule-based offers
      const offers = topContacts.slice(0, 5).map(c => ({
        workspace_id: workspaceId,
        contact_id: c.contact_id,
        title: c.orderCount > 3 ? `Desconto fidelidade para ${c.name || c.email}` : `Oferta especial para ${c.name || c.email}`,
        description: c.orderCount > 3 ? "Cliente frequente - desconto de agradecimento" : "Incentivo para próxima compra",
        offer_type: c.orderCount > 3 ? "retention" : "upsell",
        ai_reasoning: `${c.orderCount} encomendas, €${c.totalSpent.toFixed(2)} gastos`,
        confidence_score: 0.6,
        discount_percentage: c.orderCount > 3 ? 15 : 10,
        delivery_channel: "store",
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const { error: insertError } = await supabase.from("store_ai_offers").insert(offers);
      if (insertError) throw insertError;

      return new Response(JSON.stringify({ offers: offers.length, method: "rule-based" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid AI response");
    const aiOffers = JSON.parse(jsonMatch[0]);

    // Map AI offers to DB records
    const dbOffers = aiOffers.map((ai: any) => {
      const contact = topContacts.find(c => c.email === ai.customer_email);
      return {
        workspace_id: workspaceId,
        contact_id: contact?.contact_id || null,
        title: ai.title,
        description: ai.description,
        offer_type: ai.offer_type || "discount",
        ai_reasoning: ai.reasoning,
        confidence_score: ai.confidence || 0.5,
        based_on: { purchase_history: contact?.productNames?.slice(0, 10) },
        discount_percentage: ai.discount_percentage || null,
        delivery_channel: ai.delivery_channel || "store",
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    if (dbOffers.length > 0) {
      const { error: insertError } = await supabase.from("store_ai_offers").insert(dbOffers);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ offers: dbOffers.length, method: "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
