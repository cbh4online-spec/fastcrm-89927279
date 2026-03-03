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

    const { project_id, supplier_ids, workspace_id, title, due_date } = await req.json();
    if (!project_id || !workspace_id || !supplier_ids?.length) {
      return new Response(JSON.stringify({ error: "project_id, workspace_id and supplier_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get open needs for this project
    const { data: needs } = await supabase
      .from("procurement_needs")
      .select("*, products:product_id(name)")
      .eq("project_id", project_id)
      .eq("workspace_id", workspace_id)
      .eq("status", "open");

    if (!needs?.length) {
      return new Response(JSON.stringify({ error: "No open procurement needs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project name for RFQ title
    const { data: project } = await supabase
      .from("procurement_projects")
      .select("name")
      .eq("id", project_id)
      .single();

    // Create RFQ
    const { data: rfq, error: rfqErr } = await supabase
      .from("rfqs")
      .insert({
        workspace_id,
        project_id,
        title: title || `RFQ - ${project?.name || project_id.slice(0, 8)}`,
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

    // Create RFQ suppliers
    const rfqSuppliersData = supplier_ids.map((sid: string) => ({
      workspace_id,
      rfq_id: rfq.id,
      supplier_id: sid,
      status: "invited",
    }));

    const { error: suppErr } = await supabase.from("rfq_suppliers").insert(rfqSuppliersData);
    if (suppErr) throw suppErr;

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
