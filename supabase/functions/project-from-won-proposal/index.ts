import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { proposal_id, workspace_id } = await req.json();
    if (!proposal_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "proposal_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate proposal
    const { data: proposal, error: pErr } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposal_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (pErr || !proposal) {
      return new Response(JSON.stringify({ error: "Proposal not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (proposal.status !== "accepted") {
      return new Response(JSON.stringify({ error: "Proposal must be accepted" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if project already exists for this proposal
    const { data: existing } = await supabase
      .from("procurement_projects")
      .select("id")
      .eq("source_type", "proposal")
      .eq("source_id", proposal_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ project_id: existing.id, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get proposal items with products
    const { data: items } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposal_id);

    const productItems = (items || []).filter((i: any) => i.product_id);

    if (!productItems.length) {
      return new Response(JSON.stringify({ error: "No product items in proposal" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create project
    const { data: project, error: projErr } = await supabase
      .from("procurement_projects")
      .insert({
        workspace_id,
        source_type: "proposal",
        source_id: proposal_id,
        name: proposal.title || `Projeto - ${proposal_id.slice(0, 8)}`,
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (projErr) throw projErr;

    // For each product item, get stock and create project_item + need
    let hasNeeds = false;
    for (const item of productItems) {
      // Get current stock
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();

      const stockQty = Number(product?.stock_quantity || 0);
      const qtySold = Number(item.quantity || 1);
      const qtyToBuy = Math.max(0, qtySold - stockQty);

      // Create project item
      const { data: projItem } = await supabase
        .from("procurement_project_items")
        .insert({
          workspace_id,
          project_id: project.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          description: item.description || item.name,
          qty_sold: qtySold,
          qty_required: qtySold,
          qty_in_stock_at_creation: stockQty,
          qty_to_buy: qtyToBuy,
          procurement_status: qtyToBuy > 0 ? "none" : "received",
        })
        .select()
        .single();

      // Create procurement need if qty_to_buy > 0
      if (qtyToBuy > 0 && projItem) {
        hasNeeds = true;
        await supabase.from("procurement_needs").insert({
          workspace_id,
          project_id: project.id,
          project_item_id: projItem.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          qty_needed: qtySold,
          qty_available: stockQty,
          qty_to_buy: qtyToBuy,
          status: "open",
        });
      }
    }

    // Update project status
    if (hasNeeds) {
      await supabase.from("procurement_projects").update({ status: "waiting_procurement" }).eq("id", project.id);
    }

    return new Response(JSON.stringify({ project_id: project.id, has_needs: hasNeeds, items_count: productItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-from-won-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
