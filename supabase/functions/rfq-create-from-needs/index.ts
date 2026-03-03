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

    const { project_id, supplier_ids, workspace_id, title, due_date, need_ids } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get open needs - filter by project or need_ids
    let needsQuery = supabase
      .from("procurement_needs")
      .select("*, products:product_id(name)")
      .eq("workspace_id", workspace_id)
      .in("status", ["open", "rfq_in_progress"]);

    if (need_ids?.length) {
      needsQuery = needsQuery.in("id", need_ids);
    } else if (project_id) {
      needsQuery = needsQuery.eq("project_id", project_id);
    }

    const { data: needs } = await needsQuery;

    if (!needs?.length) {
      return new Response(JSON.stringify({ error: "No open procurement needs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rfqTitle = title;
    if (!rfqTitle && project_id) {
      const { data: project } = await supabase
        .from("procurement_projects")
        .select("name")
        .eq("id", project_id)
        .single();
      rfqTitle = `RFQ - ${project?.name || "Necessidades"}`;
    }
    if (!rfqTitle) {
      rfqTitle = `RFQ - Necessidades de Compra ${new Date().toLocaleDateString("pt-PT")}`;
    }

    // Create RFQ
    const { data: rfq, error: rfqErr } = await supabase
      .from("rfqs")
      .insert({
        workspace_id,
        project_id: project_id || null,
        title: rfqTitle,
        status: "draft",
        due_date: due_date || null,
        created_by: userId,
      })
      .select()
      .single();

    if (rfqErr) throw rfqErr;


    // Create RFQ items from needs
    const rfqItemsData = needs.map((n: any) => ({
      workspace_id,
      rfq_id: rfq.id,
      product_id: n.product_id,
      variant_id: n.variant_id,
      qty: n.qty_to_buy,
      need_id: n.id,
    }));

    const { error: itemsErr } = await supabase.from("rfq_items").insert(rfqItemsData);
    if (itemsErr) throw itemsErr;

    // Create RFQ suppliers (only if supplier_ids provided)
    if (supplier_ids?.length) {
      const rfqSuppliersData = supplier_ids.map((sid: string) => ({
        workspace_id,
        rfq_id: rfq.id,
        supplier_id: sid,
        status: "invited",
      }));

      const { error: suppErr } = await supabase.from("rfq_suppliers").insert(rfqSuppliersData);
      if (suppErr) throw suppErr;
    }

    return new Response(JSON.stringify({ rfq_id: rfq.id, items_count: needs.length, suppliers_count: supplier_ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-create-from-needs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
