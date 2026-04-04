import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConversionPayload {
  affiliate_code: string;
  workspace_id: string;
  source_module: "store" | "marketplace" | "saas" | "other";
  order_id?: string;
  subscription_id?: string;
  external_ref?: string;
  gross_amount: number;
  link_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: ConversionPayload = await req.json();

    if (!payload.affiliate_code || !payload.workspace_id || !payload.gross_amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find affiliate
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("id, program_id, current_tier_id, parent_affiliate_id")
      .eq("workspace_id", payload.workspace_id)
      .eq("affiliate_code", payload.affiliate_code)
      .eq("status", "active")
      .maybeSingle();

    if (!affiliate) {
      return new Response(JSON.stringify({ error: "Affiliate not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate check
    if (payload.order_id) {
      const { count } = await supabaseAdmin
        .from("affiliate_conversions")
        .select("id", { count: "exact", head: true })
        .eq("order_id", payload.order_id)
        .eq("level", 1);
      if ((count ?? 0) > 0) {
        return new Response(JSON.stringify({ error: "Conversion already registered for this order" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get commission config
    let commissionPercent = 10;
    let commissionFixed: number | null = null;
    let commissionType = "percent";
    let subAffiliatePercent = 5;

    // 1. Check program-level rule for this module
    if (affiliate.program_id) {
      const { data: rule } = await supabaseAdmin
        .from("affiliate_program_rules")
        .select("*")
        .eq("program_id", affiliate.program_id)
        .eq("rule_type", "module")
        .eq("target_id", payload.source_module)
        .eq("is_active", true)
        .maybeSingle();

      if (rule) {
        if (rule.commission_percent != null) commissionPercent = rule.commission_percent;
        if (rule.commission_fixed != null) commissionFixed = rule.commission_fixed;
      } else {
        // 2. Check tier-level commission
        if (affiliate.current_tier_id) {
          const { data: tier } = await supabaseAdmin
            .from("affiliate_program_tiers")
            .select("*")
            .eq("id", affiliate.current_tier_id)
            .maybeSingle();
          if (tier) {
            commissionPercent = tier.commission_percent;
            commissionFixed = tier.commission_fixed;
          }
        }

        // 3. Fallback to program defaults
        if (!affiliate.current_tier_id) {
          const { data: program } = await supabaseAdmin
            .from("affiliate_programs")
            .select("*")
            .eq("id", affiliate.program_id)
            .maybeSingle();
          if (program) {
            commissionType = program.commission_type;
            commissionPercent = program.default_commission_percent ?? 10;
            commissionFixed = program.default_commission_fixed;
            subAffiliatePercent = program.sub_affiliate_commission_percent ?? 5;
          }
        }
      }
    }

    // Calculate commission
    let commissionAmount = 0;
    if (commissionType === "fixed" && commissionFixed != null) {
      commissionAmount = commissionFixed;
    } else if (commissionType === "hybrid" && commissionFixed != null) {
      commissionAmount = commissionFixed + (payload.gross_amount * commissionPercent) / 100;
    } else {
      commissionAmount = (payload.gross_amount * commissionPercent) / 100;
    }

    // Settings for auto-approve
    const { data: settings } = await supabaseAdmin
      .from("affiliate_settings")
      .select("auto_approve_affiliates")
      .eq("workspace_id", payload.workspace_id)
      .maybeSingle();

    const conversionStatus = "pending"; // Always pending, admin approves

    // Insert level 1 conversion
    const { data: conversion, error } = await supabaseAdmin
      .from("affiliate_conversions")
      .insert({
        affiliate_id: affiliate.id,
        workspace_id: payload.workspace_id,
        link_id: payload.link_id || null,
        source_module: payload.source_module,
        order_id: payload.order_id || null,
        subscription_id: payload.subscription_id || null,
        external_ref: payload.external_ref || null,
        gross_amount: payload.gross_amount,
        commission_rate: commissionPercent,
        commission_fixed: commissionFixed,
        commission_amount: Math.round(commissionAmount * 100) / 100,
        level: 1,
        status: conversionStatus,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert level 2 (sub-affiliate) if applicable
    if (affiliate.parent_affiliate_id && subAffiliatePercent > 0) {
      const subCommission = (commissionAmount * subAffiliatePercent) / 100;
      await supabaseAdmin.from("affiliate_conversions").insert({
        affiliate_id: affiliate.parent_affiliate_id,
        workspace_id: payload.workspace_id,
        source_module: payload.source_module,
        order_id: payload.order_id || null,
        gross_amount: payload.gross_amount,
        commission_rate: subAffiliatePercent,
        commission_amount: Math.round(subCommission * 100) / 100,
        level: 2,
        parent_conversion_id: conversion.id,
        status: conversionStatus,
      });
    }

    return new Response(JSON.stringify({ ok: true, conversion_id: conversion.id, commission_amount: commissionAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
