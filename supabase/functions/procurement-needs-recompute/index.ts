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
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Collect demand from proposals (won/accepted/paid)
    const { data: proposalItems } = await supabase
      .from("proposal_items")
      .select("product_id, quantity, proposal_id, proposals!inner(status, expires_at, contact_id)")
      .eq("workspace_id", workspace_id)
      .not("product_id", "is", null)
      .in("proposals.status", ["won", "accepted", "paid"]);

    // 2) Collect demand from order notes (approved/submitted)
    const { data: orderNoteItems } = await supabase
      .from("order_note_items")
      .select("product_id, quantity, order_note_id, order_notes!inner(status, created_at)")
      .eq("workspace_id", workspace_id)
      .not("product_id", "is", null)
      .in("order_notes.status", ["approved", "submitted"]);

    // 3) Collect demand from procurement project items (open projects)
    const { data: projectItems } = await supabase
      .from("procurement_project_items")
      .select("product_id, variant_id, qty, project_id, procurement_projects!inner(status, target_date)")
      .eq("workspace_id", workspace_id)
      .not("product_id", "is", null)
      .in("procurement_projects.status", ["open", "in_progress"]);

    // Aggregate demand by product_id
    interface DemandEntry {
      type: string;
      id: string;
      qty: number;
      due_date: string | null;
    }

    const demandMap = new Map<string, { total: number; sources: DemandEntry[]; earliest: string | null }>();

    const addDemand = (productId: string, qty: number, source: DemandEntry) => {
      const existing = demandMap.get(productId) || { total: 0, sources: [], earliest: null };
      existing.total += qty;
      existing.sources.push(source);
      if (source.due_date) {
        if (!existing.earliest || source.due_date < existing.earliest) {
          existing.earliest = source.due_date;
        }
      }
      demandMap.set(productId, existing);
    };

    // Process proposal items
    for (const item of (proposalItems || [])) {
      const proposal = (item as any).proposals;
      addDemand(item.product_id!, item.quantity, {
        type: "proposal",
        id: item.proposal_id,
        qty: item.quantity,
        due_date: proposal?.expires_at || null,
      });
    }

    // Process order note items
    for (const item of (orderNoteItems || [])) {
      const orderNote = (item as any).order_notes;
      addDemand(item.product_id!, item.quantity, {
        type: "order_note",
        id: item.order_note_id,
        qty: item.quantity,
        due_date: orderNote?.created_at || null,
      });
    }

    // Process project items
    for (const item of (projectItems || [])) {
      const project = (item as any).procurement_projects;
      addDemand(item.product_id!, item.qty, {
        type: "project",
        id: item.project_id,
        qty: item.qty,
        due_date: project?.target_date || null,
      });
    }

    if (demandMap.size === 0) {
      // No demand — resolve all open board needs
      await supabase
        .from("procurement_needs")
        .update({ status: "resolved", shortage: 0, demand_total: 0, last_computed_at: new Date().toISOString() })
        .eq("workspace_id", workspace_id)
        .is("project_id", null)
        .in("status", ["open"]);

      return new Response(JSON.stringify({ message: "No demand found, all resolved", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Get stock for all demanded products
    const productIds = Array.from(demandMap.keys());
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity, track_stock, reorder_point, last_cost, category")
      .eq("workspace_id", workspace_id)
      .in("id", productIds);

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    // 5) Get existing stock allocations
    const { data: allocations } = await supabase
      .from("stock_allocations")
      .select("product_id, qty_allocated")
      .eq("workspace_id", workspace_id)
      .in("product_id", productIds);

    const allocationMap = new Map<string, number>();
    for (const a of (allocations || [])) {
      allocationMap.set(a.product_id!, (allocationMap.get(a.product_id!) || 0) + a.qty_allocated);
    }

    // 6) Get supplier recommendations
    const { data: supplierProducts } = await supabase
      .from("supplier_products")
      .select("product_id, supplier_id, unit_price, lead_time_days, is_preferred, quality_score, reliability_score, suppliers!inner(name)")
      .eq("workspace_id", workspace_id)
      .in("product_id", productIds);

    // Group suppliers by product
    const supplierMap = new Map<string, any[]>();
    for (const sp of (supplierProducts || [])) {
      const list = supplierMap.get(sp.product_id) || [];
      list.push(sp);
      supplierMap.set(sp.product_id, list);
    }

    // Score and rank suppliers
    function rankSuppliers(candidates: any[], shortage: number) {
      if (!candidates.length) return { top: null, ranking: [] };

      const prices = candidates.map((c: any) => c.unit_price).filter((p: number) => p > 0);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);

      const scored = candidates.map((c: any) => {
        const priceScore = maxP > minP ? 100 - ((c.unit_price - minP) / (maxP - minP)) * 100 : 100;
        const prefScore = c.is_preferred ? 100 : 0;
        const qualScore = c.quality_score ? c.quality_score * 20 : 50;
        const relScore = c.reliability_score ? c.reliability_score * 20 : 50;
        const score = priceScore * 0.35 + 50 * 0.20 + prefScore * 0.15 + relScore * 0.15 + qualScore * 0.15;

        return {
          supplier_id: c.supplier_id,
          supplier_name: (c.suppliers as any)?.name || "N/A",
          unit_price: c.unit_price,
          score: Math.round(score * 100) / 100,
          is_preferred: c.is_preferred,
        };
      }).sort((a: any, b: any) => b.score - a.score);

      return { top: scored[0], ranking: scored.slice(0, 3) };
    }

    // 7) Upsert procurement_needs (board-level, project_id = null)
    const now = new Date().toISOString();
    let upsertCount = 0;

    // Get existing board-level needs to preserve statuses
    const { data: existingNeeds } = await supabase
      .from("procurement_needs")
      .select("id, product_id, status")
      .eq("workspace_id", workspace_id)
      .is("project_id", null);

    const existingNeedMap = new Map((existingNeeds || []).map((n: any) => [n.product_id, n]));

    for (const [productId, demand] of demandMap.entries()) {
      const product = productMap.get(productId);
      const stockOnHand = product?.stock_quantity || 0;
      const stockAllocated = allocationMap.get(productId) || 0;
      const stockAvailable = Math.max(0, stockOnHand - stockAllocated);
      const shortage = Math.max(0, demand.total - stockAvailable);
      const lastCost = product?.last_cost || 0;
      const estimatedValue = shortage * lastCost;

      // Priority score: urgency + magnitude + value
      let priorityScore = 0;
      if (demand.earliest) {
        const daysUntilDue = Math.max(0, (new Date(demand.earliest).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        priorityScore += Math.max(0, 100 - daysUntilDue * 5); // higher urgency = higher score
      }
      priorityScore += Math.min(50, shortage * 2); // magnitude
      priorityScore += Math.min(30, estimatedValue / 100); // value

      const suppliers = supplierMap.get(productId) || [];
      const { top, ranking } = rankSuppliers(suppliers, shortage);

      // Determine status
      const existing = existingNeedMap.get(productId);
      let status = "open";
      if (existing) {
        if (["rfq_in_progress", "ordered", "partially_received", "ignored"].includes(existing.status)) {
          status = existing.status; // preserve user-set statuses
        } else if (shortage === 0) {
          status = "resolved";
        }
      } else if (shortage === 0 && (!product?.reorder_point || stockAvailable >= product.reorder_point)) {
        continue; // no need to create a record if no shortage and above reorder point
      }

      const needData: any = {
        workspace_id,
        product_id: productId,
        variant_id: null,
        project_id: null,
        project_item_id: null,
        demand_total: demand.total,
        stock_on_hand: stockOnHand,
        stock_allocated: stockAllocated,
        stock_available: stockAvailable,
        shortage,
        earliest_due_date: demand.earliest,
        demand_sources_json: demand.sources,
        qty_needed: demand.total,
        qty_available: stockAvailable,
        qty_to_buy: shortage,
        status,
        recommended_supplier_id: top?.supplier_id || null,
        suggested_unit_price: top?.unit_price || null,
        suggestion_json: ranking.length ? { ranking } : null,
        last_computed_at: now,
        updated_at: now,
        priority_score: Math.round(priorityScore),
        estimated_value: estimatedValue,
      };

      if (existing) {
        await supabase
          .from("procurement_needs")
          .update(needData)
          .eq("id", existing.id);
      } else {
        needData.created_at = now;
        await supabase
          .from("procurement_needs")
          .insert(needData);
      }
      upsertCount++;
    }

    // Resolve needs for products no longer in demand
    const currentProductIds = new Set(demandMap.keys());
    const toResolve = (existingNeeds || []).filter((n: any) => !currentProductIds.has(n.product_id) && n.status === "open");
    if (toResolve.length) {
      await supabase
        .from("procurement_needs")
        .update({ status: "resolved", shortage: 0, demand_total: 0, last_computed_at: now })
        .in("id", toResolve.map((n: any) => n.id));
    }

    return new Response(JSON.stringify({
      message: "Recompute complete",
      needs_updated: upsertCount,
      needs_resolved: toResolve.length,
      total_products_with_demand: demandMap.size,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in procurement-needs-recompute:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
