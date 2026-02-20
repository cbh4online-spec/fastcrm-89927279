import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MODULE-USAGE-STATS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
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

    logStep("User authenticated", { userId: user.id });

    const { workspaceId, moduleId, period = 'current' } = await req.json();

    if (!workspaceId) {
      throw new Error("Missing required parameter: workspaceId");
    }

    // Build query for subscriptions
    let subscriptionsQuery = supabase
      .from('workspace_module_subscriptions')
      .select(`
        *,
        pricing:module_pricing!inner(*)
      `)
      .eq('workspace_id', workspaceId);

    if (moduleId) {
      subscriptionsQuery = subscriptionsQuery.eq('module_id', moduleId);
    }

    const { data: subscriptions, error: subError } = await subscriptionsQuery;

    if (subError) {
      logStep("Error fetching subscriptions", { error: subError.message });
      throw subError;
    }

    // Get credit balances
    let balancesQuery = supabase
      .from('workspace_credit_balances')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (moduleId) {
      balancesQuery = balancesQuery.eq('module_id', moduleId);
    }

    if (period === 'current') {
      balancesQuery = balancesQuery
        .lte('period_start', new Date().toISOString())
        .gte('period_end', new Date().toISOString());
    }

    const { data: balances, error: balError } = await balancesQuery;

    if (balError) {
      logStep("Error fetching balances", { error: balError.message });
      throw balError;
    }

    // Get consumption logs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let consumptionQuery = supabase
      .from('credit_consumption_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (moduleId) {
      consumptionQuery = consumptionQuery.eq('module_id', moduleId);
    }

    const { data: consumption, error: consError } = await consumptionQuery;

    if (consError) {
      logStep("Error fetching consumption", { error: consError.message });
      throw consError;
    }

    // Get alerts
    let alertsQuery = supabase
      .from('module_usage_alerts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (moduleId) {
      alertsQuery = alertsQuery.eq('module_id', moduleId);
    }

    const { data: alerts, error: alertsError } = await alertsQuery;

    if (alertsError) {
      logStep("Error fetching alerts", { error: alertsError.message });
      throw alertsError;
    }

    // Build response
    const moduleStats = (subscriptions || []).map(sub => {
      const balance = balances?.find(b => b.module_id === sub.module_id);
      const moduleConsumption = consumption?.filter(c => c.module_id === sub.module_id) || [];
      const moduleAlerts = alerts?.filter(a => a.module_id === sub.module_id) || [];

      const creditsTotal = (balance?.credits_total || 0) + (balance?.extra_credits || 0);
      const creditsUsed = (balance?.credits_used || 0) + (balance?.extra_credits_used || 0);
      const creditsRemaining = creditsTotal - creditsUsed;
      const usagePercent = creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0;

      // Group consumption by action
      const consumptionByAction: Record<string, number> = {};
      moduleConsumption.forEach(c => {
        consumptionByAction[c.action_key] = (consumptionByAction[c.action_key] || 0) + c.credits_consumed;
      });

      return {
        moduleId: sub.module_id,
        status: sub.status,
        billingCycle: sub.billing_cycle,
        periodStart: sub.current_period_start,
        periodEnd: sub.current_period_end,
        trialEnd: sub.trial_end,
        pricing: {
          model: sub.pricing?.pricing_model,
          basePrice: sub.pricing?.base_price_monthly,
          creditsIncluded: sub.pricing?.credits_included,
          creditPrice: sub.pricing?.credit_price
        },
        credits: {
          total: creditsTotal,
          used: creditsUsed,
          remaining: creditsRemaining,
          usagePercent,
          includedRemaining: balance?.credits_remaining || 0,
          extraRemaining: (balance?.extra_credits || 0) - (balance?.extra_credits_used || 0)
        },
        consumptionByAction,
        totalConsumption: moduleConsumption.reduce((acc, c) => acc + c.credits_consumed, 0),
        recentConsumption: moduleConsumption.slice(0, 10),
        alerts: moduleAlerts
      };
    });

    logStep("Stats compiled", { modulesCount: moduleStats.length });

    return new Response(JSON.stringify({
      workspace_id: workspaceId,
      modules: moduleStats,
      totalAlerts: alerts?.length || 0,
      summary: {
        activeModules: moduleStats.filter(m => m.status === 'active').length,
        totalCreditsUsed: moduleStats.reduce((acc, m) => acc + m.credits.used, 0),
        totalCreditsRemaining: moduleStats.reduce((acc, m) => acc + m.credits.remaining, 0)
      }
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
