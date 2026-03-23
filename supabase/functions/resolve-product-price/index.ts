import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      workspace_id,
      product_id,
      contact_id,
      company_id,
      quantity = 1,
    } = await req.json();

    if (!workspace_id || !product_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id and product_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get base product info
    const { data: product } = await supabase
      .from("products")
      .select("id, name, base_price, direct_cost, category, currency")
      .eq("id", product_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    let finalPrice = product.base_price;
    let priceSource = "base_price";
    const appliedRules: any[] = [];

    // 2. Determine price list (contact > company > default)
    let priceListId: string | null = null;

    if (contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("price_list_id, company_id")
        .eq("id", contact_id)
        .single();

      priceListId = contact?.price_list_id || null;

      // If no price list on contact, check company
      if (!priceListId && (contact?.company_id || company_id)) {
        const cid = company_id || contact?.company_id;
        const { data: company } = await supabase
          .from("companies")
          .select("price_list_id")
          .eq("id", cid)
          .single();
        priceListId = company?.price_list_id || null;
      }
    } else if (company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("price_list_id")
        .eq("id", company_id)
        .single();
      priceListId = company?.price_list_id || null;
    }

    // If no entity-specific list, get workspace default
    if (!priceListId) {
      const { data: defaultList } = await supabase
        .from("price_lists")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("is_default", true)
        .eq("is_active", true)
        .single();
      priceListId = defaultList?.id || null;
    }

    // 3. Get price from price list (with volume tiers)
    if (priceListId) {
      const { data: listItems } = await supabase
        .from("price_list_items")
        .select("price, min_quantity, margin_percent")
        .eq("price_list_id", priceListId)
        .eq("product_id", product_id)
        .lte("min_quantity", quantity)
        .order("min_quantity", { ascending: false })
        .limit(1);

      if (listItems && listItems.length > 0) {
        finalPrice = listItems[0].price;
        priceSource = "price_list";
        appliedRules.push({
          type: "price_list",
          price_list_id: priceListId,
          price: listItems[0].price,
          min_quantity: listItems[0].min_quantity,
        });
      }
    }

    // 4. Apply price rules (sorted by priority)
    const { data: rules } = await supabase
      .from("price_rules")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    const applicableRules = (rules || []).filter((r: any) => {
      // Check validity dates
      if (r.valid_from && r.valid_from > now) return false;
      if (r.valid_until && r.valid_until < now) return false;

      // Check quantity range
      if (r.min_quantity && quantity < r.min_quantity) return false;
      if (r.max_quantity && quantity > r.max_quantity) return false;

      // Check scope
      if (r.rule_type === "client_discount" || r.rule_type === "special_price") {
        if (r.contact_id && r.contact_id !== contact_id) return false;
        if (r.company_id && r.company_id !== company_id) return false;
        if (r.product_id && r.product_id !== product_id) return false;
        return true;
      }

      if (r.rule_type === "volume_discount") {
        if (r.product_id && r.product_id !== product_id) return false;
        if (r.category && r.category !== product.category) return false;
        return true;
      }

      if (r.rule_type === "category_discount") {
        if (r.category && r.category !== product.category) return false;
        return true;
      }

      return true;
    });

    // Apply best rule (highest priority wins)
    for (const rule of applicableRules) {
      let discountAmount = 0;

      if (rule.discount_type === "fixed_price") {
        // Override price entirely
        finalPrice = rule.discount_value;
        priceSource = `rule:${rule.rule_type}`;
        appliedRules.push({
          type: rule.rule_type,
          rule_id: rule.id,
          name: rule.name,
          discount_type: "fixed_price",
          final_price: rule.discount_value,
        });
        break; // fixed_price overrides everything
      }

      if (rule.discount_type === "percentage") {
        discountAmount = finalPrice * (rule.discount_value / 100);
      } else if (rule.discount_type === "fixed") {
        discountAmount = rule.discount_value;
      }

      if (discountAmount > 0) {
        finalPrice = Math.max(0, finalPrice - discountAmount);
        priceSource = `rule:${rule.rule_type}`;
        appliedRules.push({
          type: rule.rule_type,
          rule_id: rule.id,
          name: rule.name,
          discount_type: rule.discount_type,
          discount_value: rule.discount_value,
          discount_amount: Math.round(discountAmount * 100) / 100,
        });
      }
    }

    // 5. Calculate margin
    const cost = product.direct_cost || 0;
    const marginAmount = finalPrice - cost;
    const marginPercent = finalPrice > 0 ? (marginAmount / finalPrice) * 100 : 0;

    const result = {
      product_id: product.id,
      product_name: product.name,
      base_price: product.base_price,
      final_price: Math.round(finalPrice * 100) / 100,
      currency: product.currency || "EUR",
      quantity,
      line_total: Math.round(finalPrice * quantity * 100) / 100,
      price_source: priceSource,
      price_list_id: priceListId,
      cost,
      margin_amount: Math.round(marginAmount * 100) / 100,
      margin_percent: Math.round(marginPercent * 100) / 100,
      applied_rules: appliedRules,
      discount_from_base: Math.round((product.base_price - finalPrice) * 100) / 100,
      discount_percent_from_base:
        product.base_price > 0
          ? Math.round(((product.base_price - finalPrice) / product.base_price) * 10000) / 100
          : 0,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("resolve-product-price error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
