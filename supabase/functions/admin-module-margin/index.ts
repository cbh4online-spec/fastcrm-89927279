import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-MODULE-MARGIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      throw new Error("Access denied. Super admin required.");
    }

    logStep("Admin authenticated", { userId: user.id });

    const { moduleId, startDate, endDate } = await req.json();

    // If no module specified, get all modules
    const { data: modules } = await supabase
      .from('module_pricing')
      .select('module_id, base_price_monthly, internal_cost_per_credit, credits_included')
      .eq('is_active', true);

    const moduleIds = moduleId ? [moduleId] : (modules?.map(m => m.module_id) || []);
    
    const startTimestamp = startDate || new Date(new Date().setDate(1)).toISOString();
    const endTimestamp = endDate || new Date().toISOString();

    logStep("Calculating margins", { moduleIds, startTimestamp, endTimestamp });

    const results = await Promise.all(moduleIds.map(async (modId: string) => {
      // Get margin from database function
      const { data: marginData, error: marginError } = await supabase.rpc('calculate_module_margin', {
        p_module_id: modId,
        p_start_date: startTimestamp,
        p_end_date: endTimestamp
      });

      if (marginError) {
        logStep("Error calculating margin", { moduleId: modId, error: marginError.message });
        return null;
      }

      const margin = marginData?.[0] || {
        total_revenue: 0,
        total_internal_cost: 0,
        gross_margin: 0,
        margin_percent: 0,
        total_credits_consumed: 0,
        total_subscriptions: 0
      };

      // Get pricing info
      const pricing = modules?.find(m => m.module_id === modId);

      // Get action breakdown
      const { data: actionBreakdown } = await supabase
        .from('credit_consumption_logs')
        .select('action_key')
        .eq('module_id', modId)
        .gte('created_at', startTimestamp)
        .lte('created_at', endTimestamp);

      const actionCounts: Record<string, number> = {};
      actionBreakdown?.forEach(log => {
        actionCounts[log.action_key] = (actionCounts[log.action_key] || 0) + 1;
      });

      // Get action costs
      const { data: actionCosts } = await supabase
        .from('module_action_costs')
        .select('action_key, action_name, credits_cost, internal_cost')
        .eq('module_id', modId);

      const actionsWithMargin = actionCosts?.map(action => {
        const count = actionCounts[action.action_key] || 0;
        const totalCredits = count * action.credits_cost;
        const totalInternalCost = count * (action.internal_cost || 0);
        const revenuePerCredit = pricing?.base_price_monthly && pricing?.credits_included 
          ? pricing.base_price_monthly / pricing.credits_included 
          : 0;
        const estimatedRevenue = totalCredits * revenuePerCredit;

        return {
          actionKey: action.action_key,
          actionName: action.action_name,
          executionCount: count,
          totalCreditsConsumed: totalCredits,
          internalCost: totalInternalCost,
          estimatedRevenue,
          margin: estimatedRevenue - totalInternalCost,
          marginPercent: estimatedRevenue > 0 
            ? Math.round(((estimatedRevenue - totalInternalCost) / estimatedRevenue) * 100) 
            : 0
        };
      }) || [];

      return {
        moduleId: modId,
        period: { start: startTimestamp, end: endTimestamp },
        summary: {
          totalRevenue: parseFloat(margin.total_revenue) || 0,
          totalInternalCost: parseFloat(margin.total_internal_cost) || 0,
          grossMargin: parseFloat(margin.gross_margin) || 0,
          marginPercent: parseFloat(margin.margin_percent) || 0,
          totalCreditsConsumed: margin.total_credits_consumed || 0,
          activeSubscriptions: margin.total_subscriptions || 0
        },
        pricing: {
          monthlyPrice: pricing?.base_price_monthly || 0,
          creditsIncluded: pricing?.credits_included || 0,
          internalCostPerCredit: pricing?.internal_cost_per_credit || 0
        },
        actions: actionsWithMargin.sort((a, b) => b.executionCount - a.executionCount)
      };
    }));

    const validResults = results.filter(r => r !== null);

    // Calculate totals
    const totals = {
      totalRevenue: validResults.reduce((acc, r) => acc + r!.summary.totalRevenue, 0),
      totalInternalCost: validResults.reduce((acc, r) => acc + r!.summary.totalInternalCost, 0),
      grossMargin: 0,
      marginPercent: 0,
      totalCreditsConsumed: validResults.reduce((acc, r) => acc + r!.summary.totalCreditsConsumed, 0),
      totalSubscriptions: validResults.reduce((acc, r) => acc + r!.summary.activeSubscriptions, 0)
    };
    totals.grossMargin = totals.totalRevenue - totals.totalInternalCost;
    totals.marginPercent = totals.totalRevenue > 0 
      ? Math.round((totals.grossMargin / totals.totalRevenue) * 100) 
      : 0;

    logStep("Margins calculated", { modulesCount: validResults.length, totals });

    return new Response(JSON.stringify({
      modules: validResults,
      totals,
      period: { start: startTimestamp, end: endTimestamp }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
