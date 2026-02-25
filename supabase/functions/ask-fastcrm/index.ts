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

    // --- Step 1: Intent Classification via Lovable AI ---
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
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI classification failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "Could not classify question" }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const intent: string = parsed.intent;
    const days: number = parsed.days ?? (intent === "closing_soon" ? 30 : 14);

    // --- Step 2: Execute query based on intent ---
    const result = await executeIntent(
      serviceClient,
      workspaceId,
      intent,
      days
    );

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

  // Get deal names
  const dealIds = atRisk.map((r: any) => r.deal_id);
  const { data: deals } = dealIds.length
    ? await client
        .from("opportunities")
        .select("id, title, value")
        .in("id", dealIds)
        .eq("workspace_id", workspaceId)
    : { data: [] };

  const dealMap = new Map((deals || []).map((d: any) => [d.id, d]));

  const items = atRisk
    .map((r: any) => {
      const deal = dealMap.get(r.deal_id);
      if (!deal) return null;
      return {
        id: deal.id,
        title: deal.title || "Untitled Deal",
        subtitle: `Health ${r.payload.health_score} · ${r.payload.top_reason || "At risk"}`,
        value: Number(deal.value) || 0,
        health_label: "AT_RISK",
        link: `/dashboard/opportunities?deal=${deal.id}`,
      };
    })
    .filter(Boolean)
    .slice(0, 10);

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
  };
}

async function queryDealsInactive(
  client: any,
  workspaceId: string,
  days: number
) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  // Get open opportunities
  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("updated_at", { ascending: true })
    .limit(50);

  if (!opps || opps.length === 0) {
    return {
      header: "No open deals found.",
      items: [],
      actions: [],
    };
  }

  // Get latest activity per deal
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
    const daysLeft = differenceInDays(
      new Date(o.expected_close_date),
      now
    );
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

  // Group by stage
  const groups = new Map<string, { count: number; value: number; name: string }>();
  (opps || []).forEach((o: any) => {
    const stageName = stageMap.get(o.stage_id) || "Unknown";
    const g = groups.get(o.stage_id) || {
      count: 0,
      value: 0,
      name: stageName,
    };
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
              id: "view_as_list",
              label: "View pipeline",
              icon: "Eye",
              type: "navigate",
              payload: { link: "/dashboard/opportunities" },
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
