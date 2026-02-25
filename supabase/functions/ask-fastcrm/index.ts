import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

// --- Sprint 1C: Keyword fast-path ---
const KEYWORD_MAP: Record<string, string> = {
  "at risk": "deals_at_risk",
  "em risco": "deals_at_risk",
  "inactive": "deals_inactive",
  "no activity": "deals_inactive",
  "sem atividade": "deals_inactive",
  "closing": "closing_soon",
  "this month": "closing_soon",
  "este mês": "closing_soon",
  "forecast": "forecast_summary",
  "previsão": "forecast_summary",
  "pipeline": "pipeline_summary",
  "bottleneck": "stage_bottleneck",
  "gargalo": "stage_bottleneck",
  "stuck": "deals_stuck_in_stage",
  "preso": "deals_stuck_in_stage",
  "no next step": "deals_no_next_step",
  "sem próximo passo": "deals_no_next_step",
  "high value": "high_value_deals",
  "alto valor": "high_value_deals",
  "overdue": "overdue_invoices",
  "vencida": "overdue_invoices",
  "approval": "pending_approvals",
  "aprovação": "pending_approvals",
  "contacts inactive": "contacts_inactive",
  "contactos inativos": "contacts_inactive",
};

function classifyByKeyword(question: string): { intent: string; days: number } | null {
  const lower = question.toLowerCase();
  for (const [keyword, intent] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      const daysMatch = lower.match(/(\d+)\s*d(?:ays|ias)?/);
      const days = daysMatch ? parseInt(daysMatch[1]) : (intent === "closing_soon" ? 30 : 14);
      return { intent, days };
    }
  }
  return null;
}

const INTENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "classify_revenue_question",
      description:
        "Classify a user question about their CRM/revenue data into a structured intent with parameters.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: [
              "deals_at_risk",
              "deals_inactive",
              "closing_soon",
              "forecast_summary",
              "pipeline_summary",
              "contacts_inactive",
              "stage_bottleneck",
              "deals_no_next_step",
              "deals_stuck_in_stage",
              "high_value_deals",
              "overdue_invoices",
              "pending_approvals",
            ],
            description: "The classified intent of the question.",
          },
          days: {
            type: "number",
            description:
              "Number of days parameter if applicable (e.g. inactive days, closing window). Default 14 for inactive, 30 for closing.",
          },
        },
        required: ["intent"],
        additionalProperties: false,
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing X-Workspace-Id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing question field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // --- Sprint 1C: Try keyword fast-path first ---
    let intent: string;
    let days: number;

    const keywordResult = classifyByKeyword(question);
    if (keywordResult) {
      intent = keywordResult.intent;
      days = keywordResult.days;
    } else {
      // --- Fallback: Intent Classification via Lovable AI ---
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
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
                content: `You classify CRM revenue questions into intents. Available intents:
- deals_at_risk: deals with low health scores
- deals_inactive: deals with no recent activity (default 14 days)
- closing_soon: deals expected to close within N days (default 30)
- forecast_summary: revenue forecast overview
- pipeline_summary: pipeline stage distribution
- contacts_inactive: contacts without recent activity
- stage_bottleneck: stages where deals are stuck longer than expected
- deals_no_next_step: deals without a defined next action or pending tasks
- deals_stuck_in_stage: deals that stayed in their current stage longer than expected
- high_value_deals: top deals by value
- overdue_invoices: invoices past due date
- pending_approvals: items waiting for approval

Extract the intent and optional days parameter. Always call the tool.`,
              },
              { role: "user", content: question },
            ],
            tools: INTENT_TOOLS,
            tool_choice: {
              type: "function",
              function: { name: "classify_revenue_question" },
            },
          }),
        }
      );

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const txt = await aiResponse.text();
        console.error("AI gateway error:", status, txt);
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "AI classification failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(
          JSON.stringify({ error: "Could not classify question" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      intent = parsed.intent;
      days = parsed.days ?? (intent === "closing_soon" ? 30 : 14);
    }

    // --- Execute query based on intent ---
    const result = await executeIntent(serviceClient, workspaceId, intent, days);

    // --- Log query (non-blocking) ---
    serviceClient
      .from("ask_fastcrm_query_logs")
      .insert({
        workspace_id: workspaceId,
        user_id: claimsData.claims.sub,
        question,
        intent,
        items_count: result.items?.length ?? 0,
      })
      .then(({ error: logErr }: any) => {
        if (logErr) console.error("ask-fastcrm log error:", logErr);
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-fastcrm error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function executeIntent(
  client: any,
  workspaceId: string,
  intent: string,
  days: number
) {
  switch (intent) {
    case "deals_at_risk":
      return await queryDealsAtRisk(client, workspaceId);
    case "deals_inactive":
      return await queryDealsInactive(client, workspaceId, days);
    case "closing_soon":
      return await queryClosingSoon(client, workspaceId, days);
    case "forecast_summary":
      return await queryForecast(client, workspaceId);
    case "pipeline_summary":
      return await queryPipeline(client, workspaceId);
    case "contacts_inactive":
      return await queryContactsInactive(client, workspaceId, days);
    case "stage_bottleneck":
      return await queryStageBottleneck(client, workspaceId);
    case "deals_no_next_step":
      return await queryDealsNoNextStep(client, workspaceId);
    case "deals_stuck_in_stage":
      return await queryDealsStuckInStage(client, workspaceId);
    case "high_value_deals":
      return await queryHighValueDeals(client, workspaceId);
    case "overdue_invoices":
      return await queryOverdueInvoices(client, workspaceId);
    case "pending_approvals":
      return {
        header: "Pending approvals — coming soon.",
        items: [],
        actions: [],
        metric: { label: "Approvals", value: "—", trend: "neutral" as const },
      };
    default:
      return {
        header: "I couldn't understand that question.",
        items: [],
        actions: [],
      };
  }
}

// ---- Intent Handlers ----

async function queryDealsAtRisk(client: any, workspaceId: string) {
  // Get cached intelligence data
  const { data: cache } = await client
    .from("deal_intelligence_cache")
    .select("deal_id, payload")
    .eq("workspace_id", workspaceId)
    .is("invalidated_at", null)
    .gt("expires_at", new Date().toISOString());

  const atRisk = (cache || []).filter(
    (c: any) => c.payload?.health_label === "AT_RISK"
  );

  const dealIds = atRisk.map((r: any) => r.deal_id);

  // Sprint 3A: Join deal_scores for real health scores
  const [{ data: deals }, { data: scores }] = await Promise.all([
    dealIds.length
      ? client.from("opportunities").select("id, title, value").in("id", dealIds).eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] }),
    dealIds.length
      ? client.from("deal_scores").select("deal_id, overall_score").in("deal_id", dealIds).eq("workspace_id", workspaceId)
      : Promise.resolve({ data: [] }),
  ]);

  const dealMap = new Map((deals || []).map((d: any) => [d.id, d]));
  const scoreMap = new Map((scores || []).map((s: any) => [s.deal_id, s.overall_score]));

  const items = atRisk
    .map((r: any) => {
      const deal = dealMap.get(r.deal_id);
      if (!deal) return null;
      const score = scoreMap.get(r.deal_id) ?? r.payload.health_score;
      return {
        id: deal.id,
        title: deal.title || "Untitled Deal",
        subtitle: `Health ${score} · ${r.payload.top_reason || "At risk"}`,
        value: Number(deal.value) || 0,
        health_label: "AT_RISK",
        link: `/dashboard/opportunities?deal=${deal.id}`,
        _score: score,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (a._score ?? 100) - (b._score ?? 100))
    .slice(0, 10)
    .map(({ _score, ...rest }: any) => rest);

  // Sprint 3B: Auto-suggestion
  const suggestion = items.length > 0 ? {
    text: `You have ${items.length} deal${items.length !== 1 ? "s" : ""} at risk. Want me to create follow-up tasks?`,
    action: {
      id: "suggest_tasks",
      label: "Create follow-ups",
      icon: "ListTodo",
      type: "bulk_task",
      payload: {
        deal_ids: items.map((i: any) => i.id),
        task_title: "Follow up on at-risk deal",
        priority: "HIGH",
      },
    },
  } : undefined;

  return {
    header:
      items.length > 0
        ? `${items.length} deal${items.length !== 1 ? "s" : ""} currently at risk.`
        : "No deals at risk right now.",
    items,
    actions:
      items.length > 0
        ? [
            {
              id: "create_tasks_all",
              label: "Create follow-up tasks",
              icon: "ListTodo",
              type: "bulk_task",
              payload: {
                deal_ids: items.map((i: any) => i.id),
                task_title: "Follow up on at-risk deal",
                priority: "HIGH",
              },
            },
            {
              id: "save_view",
              label: "Save as view",
              icon: "Bookmark",
              type: "create_saved_view",
              payload: {
                view_name: "Deals at Risk",
                object_type_id: "opportunity",
                filters: { health_label: "AT_RISK" },
                columns: ["title", "value", "health_label"],
              },
            },
            {
              id: "view_as_list",
              label: "View in pipeline",
              icon: "Eye",
              type: "navigate",
              payload: { link: "/dashboard/opportunities" },
            },
          ]
        : [],
    metric: {
      label: "Deals at Risk",
      value: String(items.length),
      trend: items.length > 0 ? "down" : "neutral",
    },
    suggestion,
  };
}

async function queryDealsInactive(
  client: any,
  workspaceId: string,
  days: number
) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("updated_at", { ascending: true })
    .limit(50);

  if (!opps || opps.length === 0) {
    return { header: "No open deals found.", items: [], actions: [] };
  }

  const oppIds = opps.map((o: any) => o.id);
  const { data: activities } = await client
    .from("crm_activities")
    .select("entity_id, created_at")
    .eq("entity_type", "opportunity")
    .in("entity_id", oppIds)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const lastActivityMap = new Map<string, string>();
  (activities || []).forEach((a: any) => {
    if (!lastActivityMap.has(a.entity_id)) {
      lastActivityMap.set(a.entity_id, a.created_at);
    }
  });

  const inactive = opps
    .filter((o: any) => {
      const lastAct = lastActivityMap.get(o.id) || o.updated_at;
      return lastAct < cutoff;
    })
    .map((o: any) => {
      const lastAct = lastActivityMap.get(o.id) || o.updated_at;
      const daysSince = differenceInDays(new Date(), new Date(lastAct));
      return {
        id: o.id,
        title: o.title || "Untitled Deal",
        subtitle: `No activity for ${daysSince} days`,
        value: Number(o.value) || 0,
        health_label: daysSince > 21 ? "AT_RISK" : "WATCH",
        link: `/dashboard/opportunities?deal=${o.id}`,
      };
    })
    .slice(0, 10);

  const suggestion = inactive.length > 0 ? {
    text: `You have ${inactive.length} deal${inactive.length !== 1 ? "s" : ""} with no activity in ${days}+ days. Want me to create follow-ups?`,
    action: {
      id: "suggest_tasks",
      label: "Create follow-ups",
      icon: "ListTodo",
      type: "bulk_task",
      payload: {
        deal_ids: inactive.map((i) => i.id),
        task_title: "Re-engage inactive deal",
        priority: "HIGH",
      },
    },
  } : undefined;

  return {
    header:
      inactive.length > 0
        ? `${inactive.length} deal${inactive.length !== 1 ? "s" : ""} with no activity in ${days}+ days.`
        : `All deals had activity in the last ${days} days.`,
    items: inactive,
    actions:
      inactive.length > 0
        ? [
            {
              id: "create_tasks_all",
              label: "Create follow-up tasks",
              icon: "ListTodo",
              type: "bulk_task",
              payload: {
                deal_ids: inactive.map((i) => i.id),
                task_title: "Re-engage inactive deal",
                priority: "HIGH",
              },
            },
            {
              id: "save_view",
              label: "Save as view",
              icon: "Bookmark",
              type: "create_saved_view",
              payload: {
                view_name: `Inactive Deals (${days}d+)`,
                object_type_id: "opportunity",
                filters: { inactive_days: days },
                columns: ["title", "value", "updated_at"],
              },
            },
            {
              id: "move_stage",
              label: "Move stage",
              icon: "ArrowRight",
              type: "bulk_move_stage",
              payload: {
                deal_ids: inactive.map((i) => i.id),
              },
            },
            {
              id: "view_as_list",
              label: "View deals",
              icon: "Eye",
              type: "navigate",
              payload: { link: "/dashboard/opportunities" },
            },
          ]
        : [],
    metric: {
      label: "Inactive Deals",
      value: String(inactive.length),
      trend: inactive.length > 0 ? "down" : "neutral",
    },
    suggestion,
  };
}

async function queryClosingSoon(
  client: any,
  workspaceId: string,
  days: number
) {
  const now = new Date();
  const limit = new Date(now.getTime() + days * 86400000).toISOString();

  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, expected_close_date, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .lte("expected_close_date", limit)
    .gte("expected_close_date", now.toISOString())
    .order("expected_close_date", { ascending: true })
    .limit(10);

  const items = (opps || []).map((o: any) => {
    const daysLeft = differenceInDays(new Date(o.expected_close_date), now);
    return {
      id: o.id,
      title: o.title || "Untitled Deal",
      subtitle: `Closes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      value: Number(o.value) || 0,
      health_label: daysLeft <= 7 ? "WATCH" : "HEALTHY",
      link: `/dashboard/opportunities?deal=${o.id}`,
    };
  });

  const totalValue = items.reduce((s: number, i: any) => s + i.value, 0);

  return {
    header:
      items.length > 0
        ? `${items.length} deal${items.length !== 1 ? "s" : ""} expected to close in the next ${days} days.`
        : `No deals closing in the next ${days} days.`,
    items,
    actions:
      items.length > 0
        ? [
            {
              id: "view_as_list",
              label: "View closing deals",
              icon: "Eye",
              type: "navigate",
              payload: { link: "/dashboard/opportunities" },
            },
          ]
        : [],
    metric: {
      label: "Expected Revenue",
      value: `€${totalValue.toLocaleString()}`,
      trend: "up",
    },
  };
}

async function queryForecast(client: any, workspaceId: string) {
  const { data } = await client
    .from("revenue_forecasts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("computed_at", { ascending: false })
    .limit(1);

  const forecast = data?.[0];
  if (!forecast) {
    return {
      header: "No forecast data available yet.",
      items: [],
      actions: [
        {
          id: "view_as_list",
          label: "Open pipeline",
          icon: "Eye",
          type: "navigate",
          payload: { link: "/dashboard/opportunities" },
        },
      ],
    };
  }

  const payload =
    typeof forecast.payload === "string"
      ? JSON.parse(forecast.payload)
      : forecast.payload;
  const horizon30 =
    payload?.horizons?.find((h: any) => h.days === 30) ||
    payload?.horizons?.[1];

  const expected = horizon30?.expected_case ?? payload?.expected_case ?? 0;
  const best = horizon30?.best_case ?? payload?.best_case ?? 0;
  const worst = horizon30?.worst_case ?? payload?.worst_case ?? 0;
  const riskIndex = horizon30?.risk_index ?? payload?.risk_index ?? 0;

  return {
    header: `30-day forecast: €${Math.round(expected).toLocaleString()} expected.`,
    items: [
      {
        id: "best",
        title: "Best Case",
        subtitle: `€${Math.round(best).toLocaleString()}`,
        value: best,
        link: "/dashboard/opportunities",
      },
      {
        id: "expected",
        title: "Expected Case",
        subtitle: `€${Math.round(expected).toLocaleString()}`,
        value: expected,
        link: "/dashboard/opportunities",
      },
      {
        id: "worst",
        title: "Worst Case",
        subtitle: `€${Math.round(worst).toLocaleString()}`,
        value: worst,
        link: "/dashboard/opportunities",
      },
    ],
    actions: [
      {
        id: "view_as_list",
        label: "View pipeline",
        icon: "Eye",
        type: "navigate",
        payload: { link: "/dashboard/opportunities" },
      },
    ],
    metric: {
      label: "Risk Index",
      value: `${Math.round(riskIndex * 100)}%`,
      trend: riskIndex > 0.4 ? "down" : "up",
    },
  };
}

async function queryPipeline(client: any, workspaceId: string) {
  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, stage_id, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "open");

  const { data: stages } = await client
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  const stageMap = new Map(
    (stages || []).map((s: any) => [s.id, s.name])
  );

  const groups = new Map<string, { count: number; value: number; name: string }>();
  (opps || []).forEach((o: any) => {
    const stageName = stageMap.get(o.stage_id) || "Unknown";
    const g = groups.get(o.stage_id) || { count: 0, value: 0, name: stageName };
    g.count++;
    g.value += Number(o.value) || 0;
    groups.set(o.stage_id, g);
  });

  const totalDeals = (opps || []).length;
  const totalValue = (opps || []).reduce(
    (s: number, o: any) => s + (Number(o.value) || 0),
    0
  );

  const items = (stages || [])
    .filter((s: any) => groups.has(s.id))
    .map((s: any) => {
      const g = groups.get(s.id)!;
      return {
        id: s.id,
        title: s.name,
        subtitle: `${g.count} deal${g.count !== 1 ? "s" : ""} · €${g.value.toLocaleString()}`,
        value: g.value,
        link: "/dashboard/opportunities",
      };
    });

  return {
    header: `${totalDeals} open deal${totalDeals !== 1 ? "s" : ""} worth €${totalValue.toLocaleString()}.`,
    items,
    actions: [
      {
        id: "view_as_list",
        label: "Open pipeline",
        icon: "Eye",
        type: "navigate",
        payload: { link: "/dashboard/opportunities" },
      },
    ],
    metric: {
      label: "Total Pipeline",
      value: `€${totalValue.toLocaleString()}`,
      trend: "neutral",
    },
  };
}

async function queryContactsInactive(
  client: any,
  workspaceId: string,
  days: number
) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data: contacts } = await client
    .from("contacts")
    .select("id, name, email, updated_at")
    .eq("workspace_id", workspaceId)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(10);

  const items = (contacts || []).map((c: any) => {
    const daysSince = differenceInDays(new Date(), new Date(c.updated_at));
    return {
      id: c.id,
      title: c.name || c.email || "Unknown Contact",
      subtitle: `Last updated ${daysSince} days ago`,
      value: 0,
      link: `/dashboard/contacts/${c.id}`,
    };
  });

  return {
    header:
      items.length > 0
        ? `${items.length} contact${items.length !== 1 ? "s" : ""} without activity in ${days}+ days.`
        : `All contacts had updates in the last ${days} days.`,
    items,
    actions:
      items.length > 0
        ? [
            {
              id: "view_as_list",
              label: "View contacts",
              icon: "Eye",
              type: "navigate",
              payload: { link: "/dashboard/contacts" },
            },
          ]
        : [],
    metric: {
      label: "Inactive Contacts",
      value: String(items.length),
      trend: items.length > 0 ? "down" : "neutral",
    },
  };
}

async function queryStageBottleneck(client: any, workspaceId: string) {
  const { data: stages } = await client
    .from("pipeline_stages")
    .select("id, name, expected_days, position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, stage_id, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "open");

  if (!stages || !opps) {
    return { header: "No pipeline data available.", items: [], actions: [] };
  }

  const now = new Date();
  const stageStats = new Map<
    string,
    { name: string; expected: number; totalDays: number; count: number; deals: any[] }
  >();

  stages.forEach((s: any) => {
    stageStats.set(s.id, {
      name: s.name,
      expected: s.expected_days ?? 14,
      totalDays: 0,
      count: 0,
      deals: [],
    });
  });

  opps.forEach((o: any) => {
    const stat = stageStats.get(o.stage_id);
    if (!stat) return;
    const daysIn = differenceInDays(now, new Date(o.updated_at));
    stat.totalDays += daysIn;
    stat.count++;
    stat.deals.push({ ...o, daysIn });
  });

  const bottlenecks = Array.from(stageStats.values())
    .filter((s) => s.count > 0 && s.totalDays / s.count > s.expected)
    .sort(
      (a, b) =>
        b.totalDays / b.count - b.expected - (a.totalDays / a.count - a.expected)
    )
    .slice(0, 5);

  // Collect all stuck deal IDs for bulk actions
  const stuckDealIds = bottlenecks.flatMap((b) => b.deals.map((d: any) => d.id));

  const items = bottlenecks.map((b) => {
    const avg = Math.round(b.totalDays / b.count);
    return {
      id: b.name,
      title: b.name,
      subtitle: `Avg ${avg} days vs ${b.expected} expected · ${b.count} deal${b.count !== 1 ? "s" : ""}`,
      value: b.count,
      health_label: avg > b.expected * 2 ? "AT_RISK" : "WATCH",
      link: "/dashboard/opportunities",
    };
  });

  return {
    header:
      items.length > 0
        ? `${items.length} stage${items.length !== 1 ? "s" : ""} with bottlenecks detected.`
        : "No stage bottlenecks detected.",
    items,
    actions:
      items.length > 0
        ? [
            {
              id: "move_stage",
              label: "Move stuck deals",
              icon: "ArrowRight",
              type: "bulk_move_stage",
              payload: { deal_ids: stuckDealIds },
            },
            {
              id: "create_tasks_all",
              label: "Create follow-ups",
              icon: "ListTodo",
              type: "bulk_task",
              payload: {
                deal_ids: stuckDealIds,
                task_title: "Follow up on stuck deal",
                priority: "HIGH",
              },
            },
            {
              id: "create_automation",
              label: "Create stale alert rule",
              icon: "Zap",
              type: "automation",
              payload: {
                link: "/dashboard/automations?create=true&template=opportunity-stale-alert",
              },
            },
          ]
        : [],
    metric: {
      label: "Bottleneck Stages",
      value: String(items.length),
      trend: items.length > 0 ? "down" : "neutral",
    },
  };
}

// --- Sprint 1A: New intent handlers ---

async function queryDealsNoNextStep(client: any, workspaceId: string) {
  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, ai_next_action, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .is("ai_next_action", null)
    .order("value", { ascending: false })
    .limit(50);

  if (!opps || opps.length === 0) {
    return {
      header: "All open deals have a next step defined.",
      items: [],
      actions: [],
      metric: { label: "No Next Step", value: "0", trend: "neutral" },
    };
  }

  // Filter out deals that have pending tasks
  const oppIds = opps.map((o: any) => o.id);
  const { data: tasks } = await client
    .from("tasks")
    .select("related_id")
    .eq("workspace_id", workspaceId)
    .eq("related_type", "opportunity")
    .eq("status", "pending")
    .in("related_id", oppIds);

  const dealsWithTasks = new Set((tasks || []).map((t: any) => t.related_id));
  const noNextStep = opps
    .filter((o: any) => !dealsWithTasks.has(o.id))
    .slice(0, 10);

  const items = noNextStep.map((o: any) => ({
    id: o.id,
    title: o.title || "Untitled Deal",
    subtitle: "No next action or pending tasks",
    value: Number(o.value) || 0,
    health_label: "WATCH" as const,
    link: `/dashboard/opportunities?deal=${o.id}`,
  }));

  const suggestion = items.length > 0 ? {
    text: `${items.length} deal${items.length !== 1 ? "s" : ""} have no next step. Want me to create follow-up tasks?`,
    action: {
      id: "suggest_tasks",
      label: "Create follow-ups",
      icon: "ListTodo",
      type: "bulk_task",
      payload: {
        deal_ids: items.map((i) => i.id),
        task_title: "Define next step for deal",
        priority: "MEDIUM",
      },
    },
  } : undefined;

  return {
    header: `${items.length} deal${items.length !== 1 ? "s" : ""} without a next step.`,
    items,
    actions: items.length > 0
      ? [
          {
            id: "create_tasks_all",
            label: "Create follow-up tasks",
            icon: "ListTodo",
            type: "bulk_task",
            payload: {
              deal_ids: items.map((i) => i.id),
              task_title: "Define next step for deal",
              priority: "MEDIUM",
            },
          },
          {
            id: "save_view",
            label: "Save as view",
            icon: "Bookmark",
            type: "create_saved_view",
            payload: {
              view_name: "Deals Without Next Step",
              object_type_id: "opportunity",
              filters: { no_next_step: true },
              columns: ["title", "value", "stage"],
            },
          },
          {
            id: "view_as_list",
            label: "View deals",
            icon: "Eye",
            type: "navigate",
            payload: { link: "/dashboard/opportunities" },
          },
        ]
      : [],
    metric: {
      label: "No Next Step",
      value: String(items.length),
      trend: items.length > 0 ? "down" : "neutral",
    },
    suggestion,
  };
}

async function queryDealsStuckInStage(client: any, workspaceId: string) {
  const [{ data: stages }, { data: opps }] = await Promise.all([
    client
      .from("pipeline_stages")
      .select("id, name, expected_days, position")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true }),
    client
      .from("opportunities")
      .select("id, title, value, stage_id, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "open"),
  ]);

  if (!stages || !opps) {
    return { header: "No pipeline data available.", items: [], actions: [] };
  }

  const stageMap = new Map(
    (stages || []).map((s: any) => [s.id, { name: s.name, expected: s.expected_days ?? 14 }])
  );

  const now = new Date();
  const stuck = opps
    .map((o: any) => {
      const stage = stageMap.get(o.stage_id);
      if (!stage) return null;
      const daysIn = differenceInDays(now, new Date(o.updated_at));
      if (daysIn <= stage.expected) return null;
      return {
        id: o.id,
        title: o.title || "Untitled Deal",
        subtitle: `${daysIn} days in "${stage.name}" (expected ${stage.expected})`,
        value: Number(o.value) || 0,
        health_label: daysIn > stage.expected * 2 ? "AT_RISK" : "WATCH",
        link: `/dashboard/opportunities?deal=${o.id}`,
        _daysOver: daysIn - stage.expected,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b._daysOver - a._daysOver)
    .slice(0, 10)
    .map(({ _daysOver, ...rest }: any) => rest);

  return {
    header:
      stuck.length > 0
        ? `${stuck.length} deal${stuck.length !== 1 ? "s" : ""} stuck in their current stage.`
        : "No deals stuck beyond expected stage duration.",
    items: stuck,
    actions:
      stuck.length > 0
        ? [
            {
              id: "move_stage",
              label: "Move stage",
              icon: "ArrowRight",
              type: "bulk_move_stage",
              payload: { deal_ids: stuck.map((s: any) => s.id) },
            },
            {
              id: "create_tasks_all",
              label: "Create follow-ups",
              icon: "ListTodo",
              type: "bulk_task",
              payload: {
                deal_ids: stuck.map((s: any) => s.id),
                task_title: "Follow up on stuck deal",
                priority: "HIGH",
              },
            },
            {
              id: "create_automation",
              label: "Create automation",
              icon: "Zap",
              type: "automation",
              payload: {
                link: "/dashboard/automations?create=true&template=opportunity-stale-alert",
              },
            },
          ]
        : [],
    metric: {
      label: "Stuck Deals",
      value: String(stuck.length),
      trend: stuck.length > 0 ? "down" : "neutral",
    },
  };
}

async function queryHighValueDeals(client: any, workspaceId: string) {
  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, expected_close_date, stage_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("value", { ascending: false })
    .limit(10);

  const items = (opps || []).map((o: any) => ({
    id: o.id,
    title: o.title || "Untitled Deal",
    subtitle: o.expected_close_date
      ? `Closes ${new Date(o.expected_close_date).toLocaleDateString()}`
      : "No close date set",
    value: Number(o.value) || 0,
    health_label: "HEALTHY" as const,
    link: `/dashboard/opportunities?deal=${o.id}`,
  }));

  const totalValue = items.reduce((s: number, i: any) => s + i.value, 0);

  return {
    header:
      items.length > 0
        ? `Top ${items.length} high-value deals worth €${totalValue.toLocaleString()}.`
        : "No open deals found.",
    items,
    actions:
      items.length > 0
        ? [
            {
              id: "save_view",
              label: "Save as view",
              icon: "Bookmark",
              type: "create_saved_view",
              payload: {
                view_name: "High Value Deals",
                object_type_id: "opportunity",
                filters: { sort: "value_desc", limit: 10 },
                columns: ["title", "value", "expected_close_date"],
              },
            },
            {
              id: "assign_owner",
              label: "Assign owner",
              icon: "UserPlus",
              type: "bulk_assign_owner",
              payload: { deal_ids: items.map((i) => i.id) },
            },
            {
              id: "view_as_list",
              label: "View deals",
              icon: "Eye",
              type: "navigate",
              payload: { link: "/dashboard/opportunities" },
            },
          ]
        : [],
    metric: {
      label: "Total Value",
      value: `€${totalValue.toLocaleString()}`,
      trend: "up",
    },
  };
}

async function queryOverdueInvoices(client: any, workspaceId: string) {
  // Check if invoicing extension is active
  const { data: modules } = await client
    .from("workspace_modules")
    .select("module_id")
    .eq("workspace_id", workspaceId)
    .eq("is_enabled", true);

  const hasInvoicing = (modules || []).some(
    (m: any) => m.module_id === "invoicing" || m.module_id === "billing"
  );

  if (!hasInvoicing) {
    return {
      header: "Invoicing extension is not active.",
      items: [],
      actions: [
        {
          id: "enable_invoicing",
          label: "Enable in Marketplace",
          icon: "Zap",
          type: "navigate",
          payload: { link: "/dashboard/marketplace" },
        },
      ],
      metric: { label: "Overdue", value: "—", trend: "neutral" },
    };
  }

  // Query invoices if the table exists
  try {
    const { data: invoices } = await client
      .from("invoices")
      .select("id, number, total, due_date, status, contact_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "overdue")
      .order("due_date", { ascending: true })
      .limit(10);

    const items = (invoices || []).map((inv: any) => {
      const daysOverdue = differenceInDays(new Date(), new Date(inv.due_date));
      return {
        id: inv.id,
        title: `Invoice ${inv.number || inv.id.slice(0, 8)}`,
        subtitle: `${daysOverdue} days overdue`,
        value: Number(inv.total) || 0,
        health_label: daysOverdue > 30 ? "AT_RISK" : "WATCH",
        link: `/dashboard/invoices/${inv.id}`,
      };
    });

    const totalOverdue = items.reduce((s: number, i: any) => s + i.value, 0);

    return {
      header:
        items.length > 0
          ? `${items.length} overdue invoice${items.length !== 1 ? "s" : ""} totaling €${totalOverdue.toLocaleString()}.`
          : "No overdue invoices.",
      items,
      actions:
        items.length > 0
          ? [
              {
                id: "view_invoices",
                label: "View invoices",
                icon: "Eye",
                type: "navigate",
                payload: { link: "/dashboard/invoices" },
              },
            ]
          : [],
      metric: {
        label: "Overdue Amount",
        value: `€${totalOverdue.toLocaleString()}`,
        trend: items.length > 0 ? "down" : "neutral",
      },
    };
  } catch {
    return {
      header: "Invoice data is not available yet.",
      items: [],
      actions: [],
      metric: { label: "Overdue", value: "—", trend: "neutral" },
    };
  }
}
