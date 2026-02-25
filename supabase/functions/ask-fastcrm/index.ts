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

// --- Strict Contract Types ---
interface AskResponse {
  version: "1.0";
  routed_via: "deterministic" | "llm";
  confidence: number;
  intent: string;
  object_type: "deals" | "contacts" | "companies";
  query: {
    filters: { field: string; op: string; value: any }[];
    sort: { field: string; dir: "asc" | "desc" }[];
    limit: number;
  };
  answer: {
    headline: string;
    subtext?: string;
  };
  actions_available: string[];
  items: any[];
  actions: any[];
  metric?: any;
  suggestion?: any;
  did_you_mean?: string[];
}

// --- Guardrails ---
const ALLOWED_FIELDS: Record<string, string[]> = {
  deals: ["health_score", "health_label", "last_activity_days", "has_next_step", "stage", "stage_days", "amount", "close_date", "owner_id", "created_at", "updated_at"],
  contacts: ["name", "email", "updated_at", "company_id"],
  companies: ["name", "updated_at"],
};
const ALLOWED_OPS = ["=", "!=", ">", ">=", "<", "<=", "in", "between", "contains"];
const ALLOWED_SORT_FIELDS = ["health_score", "amount", "close_date", "last_activity_days", "stage_days", "updated_at"];

const ACTIONS_ENUM = {
  CREATE_TASKS_BULK: "CREATE_TASKS_BULK",
  SAVE_VIEW: "SAVE_VIEW",
  ASSIGN_OWNER_BULK: "ASSIGN_OWNER_BULK",
  MOVE_STAGE_BULK: "MOVE_STAGE_BULK",
  CREATE_AUTOMATION_FROM_TEMPLATE: "CREATE_AUTOMATION_FROM_TEMPLATE",
  NAVIGATE: "NAVIGATE",
} as const;

const DID_YOU_MEAN_DEFAULTS = ["Deals at risk", "No activity", "Closing this month", "Pipeline summary", "High value deals", "No next step"];

// --- buildResponse helper: enforces strict contract ---
function buildResponse(
  intent: string,
  objectType: "deals" | "contacts" | "companies",
  query: { filters: any[]; sort: any[]; limit: number },
  routedVia: "deterministic" | "llm",
  confidence: number,
  handlerResult: {
    headline: string;
    subtext?: string;
    items?: any[];
    actions?: any[];
    actions_available?: string[];
    metric?: any;
    suggestion?: any;
    did_you_mean?: string[];
  }
): AskResponse {
  return {
    version: "1.0",
    routed_via: routedVia,
    confidence: Math.round(confidence * 100) / 100,
    intent,
    object_type: objectType,
    query: {
      filters: query.filters,
      sort: query.sort,
      limit: Math.max(1, Math.min(100, query.limit || 25)),
    },
    answer: {
      headline: (handlerResult.headline || "").slice(0, 80),
      ...(handlerResult.subtext ? { subtext: handlerResult.subtext.slice(0, 120) } : {}),
    },
    actions_available: handlerResult.actions_available || [],
    items: handlerResult.items || [],
    actions: handlerResult.actions || [],
    ...(handlerResult.metric ? { metric: handlerResult.metric } : {}),
    ...(handlerResult.suggestion ? { suggestion: handlerResult.suggestion } : {}),
    ...(handlerResult.did_you_mean ? { did_you_mean: handlerResult.did_you_mean } : {}),
  };
}

// --- Keyword fast-path with additive confidence scoring ---
interface KeywordMatch {
  intent: string;
  days: number;
  confidence: number;
}

const PRIMARY_KEYWORDS = [
  "risk", "at risk", "em risco",
  "forecast", "previsão",
  "closing", "este mês", "this month",
  "no activity", "sem atividade", "inactive",
  "stuck", "preso",
  "high value", "alto valor",
  "no next step", "sem próximo passo",
  "pipeline", "bottleneck", "gargalo",
];

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
  "forecast risk": "forecast_risk",
  "blocking forecast": "forecast_risk",
  "forecast slipping": "forecast_risk",
  "previsão": "forecast_summary",
  "pipeline": "pipeline_summary",
  "pipeline health": "pipeline_summary",
  "pipeline summary": "pipeline_summary",
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
  // Automation intent keywords
  "remind me": "create_automation_rule",
  "alert me": "create_automation_rule",
  "auto-assign": "create_automation_rule",
  "notify me when": "create_automation_rule",
  "notify me if": "create_automation_rule",
  "create follow-up when": "create_automation_rule",
  "create task when": "create_automation_rule",
  "avisar-me": "create_automation_rule",
  "lembrar-me": "create_automation_rule",
  // Multi-object automation keywords
  "invoice overdue": "create_automation_rule",
  "overdue alert": "create_automation_rule",
  "due date approaching": "create_automation_rule",
  "fatura vencida": "create_automation_rule",
  "contact created": "create_automation_rule",
  "contact no reply": "create_automation_rule",
  "contacto criado": "create_automation_rule",
  "new contact": "create_automation_rule",
  "novo contacto": "create_automation_rule",
};

const EXACT_PHRASES: Record<string, string> = {
  "deals at risk": "deals_at_risk",
  "deals em risco": "deals_at_risk",
  "no activity": "deals_inactive",
  "sem atividade": "deals_inactive",
  "closing this month": "closing_soon",
  "a fechar este mês": "closing_soon",
  "pipeline summary": "pipeline_summary",
  "pipeline health": "pipeline_summary",
  "pipeline health summary": "pipeline_summary",
  "resumo pipeline": "pipeline_summary",
  "forecast": "forecast_summary",
  "forecast risk": "forecast_risk",
  "what's blocking my forecast": "forecast_risk",
  "why is my forecast slipping": "forecast_risk",
  "stage bottleneck": "stage_bottleneck",
  "gargalo de estágio": "stage_bottleneck",
  "no next step": "deals_no_next_step",
  "sem próximo passo": "deals_no_next_step",
  "high value deals": "high_value_deals",
  "deals alto valor": "high_value_deals",
  "overdue invoices": "overdue_invoices",
  "faturas vencidas": "overdue_invoices",
  "deals stuck": "deals_stuck_in_stage",
  "deals stuck in stage": "deals_stuck_in_stage",
  "inactive contacts": "contacts_inactive",
  "contactos inativos": "contacts_inactive",
};

function classifyByKeyword(question: string): KeywordMatch | null {
  const lower = question.toLowerCase().trim();
  const daysMatch = lower.match(/(\d+)\s*d(?:ays|ias)?/);
  const hasParameter = !!(daysMatch || /this month|este mês|next month|próximo mês/.test(lower));

  // 1. Exact phrases → 0.95
  for (const [phrase, intent] of Object.entries(EXACT_PHRASES)) {
    if (lower === phrase || lower === phrase + "?" || lower === phrase + ".") {
      const days = daysMatch ? parseInt(daysMatch[1]) : (intent === "closing_soon" ? 30 : 14);
      return { intent, days, confidence: 0.95 };
    }
  }

  // 2. Keyword partial matches with additive confidence
  const matches: { intent: string; keyword: string }[] = [];
  for (const [keyword, intent] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      matches.push({ intent, keyword });
    }
  }

  if (matches.length === 0) return null;

  const uniqueIntents = new Set(matches.map(m => m.intent));
  
  // Automation intent always needs LLM extraction — cap confidence at 0.60
  if (uniqueIntents.has("create_automation_rule")) {
    const days = daysMatch ? parseInt(daysMatch[1]) : 14;
    return { intent: "create_automation_rule", days, confidence: 0.60 };
  }

  if (uniqueIntents.size > 1) {
    const first = matches[0];
    const days = daysMatch ? parseInt(daysMatch[1]) : (first.intent === "closing_soon" ? 30 : 14);
    return { intent: first.intent, days, confidence: 0.50 };
  }

  // Additive: base 0.5 + 0.2 (primary keyword) + 0.2 (parameter)
  let conf = 0.50;
  const hasPrimary = PRIMARY_KEYWORDS.some(pk => lower.includes(pk));
  if (hasPrimary) conf += 0.20;
  if (hasParameter) conf += 0.20;

  const match = matches[0];
  const days = daysMatch ? parseInt(daysMatch[1]) : (match.intent === "closing_soon" ? 30 : 14);
  return { intent: match.intent, days, confidence: Math.min(conf, 0.90) };
}

// --- Structured query builder ---
interface StructuredQuery {
  intent: string;
  object_type: "deals" | "contacts" | "companies";
  filters: { field: string; op: string; value: any }[];
  sort: { field: string; dir: "asc" | "desc" }[];
  limit: number;
}

function buildStructuredQuery(intent: string, days: number): StructuredQuery {
  const base: StructuredQuery = { intent, object_type: "deals", filters: [], sort: [], limit: 25 };

  switch (intent) {
    case "deals_at_risk":
      return { ...base, filters: [{ field: "health_label", op: "=", value: "AT_RISK" }], sort: [{ field: "health_score", dir: "asc" }] };
    case "deals_inactive":
      return { ...base, filters: [{ field: "last_activity_days", op: ">", value: days }], sort: [{ field: "last_activity_days", dir: "desc" }] };
    case "closing_soon":
      return { ...base, filters: [{ field: "close_date", op: "between", value: { start: "now", end: `+${days}d` } }], sort: [{ field: "close_date", dir: "asc" }] };
    case "forecast_summary":
      return { ...base, filters: [], sort: [] };
    case "forecast_risk":
      return { ...base, filters: [{ field: "health_label", op: "!=", value: "HEALTHY" }, { field: "close_date", op: "between", value: { start: "now", end: "+90d" } }], sort: [{ field: "health_score", dir: "asc" }] };
    case "pipeline_summary":
      return { ...base, filters: [], sort: [{ field: "amount", dir: "desc" }] };
    case "contacts_inactive":
      return { ...base, object_type: "contacts", filters: [{ field: "updated_at", op: "<", value: `${days}_days_ago` }], sort: [{ field: "updated_at", dir: "asc" }] };
    case "stage_bottleneck":
      return { ...base, filters: [{ field: "stage_days", op: ">", value: 14 }], sort: [{ field: "stage_days", dir: "desc" }] };
    case "deals_no_next_step":
      return { ...base, filters: [{ field: "has_next_step", op: "=", value: false }], sort: [{ field: "amount", dir: "desc" }] };
    case "deals_stuck_in_stage":
      return { ...base, filters: [{ field: "stage_days", op: ">", value: 14 }], sort: [{ field: "stage_days", dir: "desc" }] };
    case "high_value_deals":
      return { ...base, filters: [], sort: [{ field: "amount", dir: "desc" }], limit: 10 };
    default:
      return base;
  }
}

// --- LLM tool definition ---
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
              "forecast_risk",
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
          object_type: {
            type: "string",
            enum: ["deals", "contacts", "companies"],
            description: "The primary object type being queried. Default 'deals'.",
          },
          filters: {
            type: "array",
            description: "Optional structured filters using allowed fields and operators.",
            items: {
              type: "object",
              properties: {
                field: { type: "string", enum: ALLOWED_FIELDS.deals },
                op: { type: "string", enum: ALLOWED_OPS },
                value: {},
              },
              required: ["field", "op", "value"],
            },
          },
          sort: {
            type: "array",
            description: "Optional sort configuration.",
            items: {
              type: "object",
              properties: {
                field: { type: "string", enum: ALLOWED_SORT_FIELDS },
                dir: { type: "string", enum: ["asc", "desc"] },
              },
              required: ["field", "dir"],
            },
          },
          limit: {
            type: "number",
            description: "Max items to return. Default 25, max 100.",
          },
        },
        required: ["intent"],
        additionalProperties: false,
      },
    },
  },
];

// --- Validate LLM output against whitelist ---
function validateLLMFilters(
  filters: { field: string; op: string; value: any }[] | undefined,
  objectType: string
): boolean {
  if (!filters || filters.length === 0) return true;
  const allowedFields = ALLOWED_FIELDS[objectType] || [];
  return filters.every(
    (f) => allowedFields.includes(f.field) && ALLOWED_OPS.includes(f.op)
  );
}

function validateLLMSort(
  sort: { field: string; dir: string }[] | undefined
): boolean {
  if (!sort || sort.length === 0) return true;
  return sort.every(
    (s) => ALLOWED_SORT_FIELDS.includes(s.field) && ["asc", "desc"].includes(s.dir)
  );
}

// --- Actions available per intent ---
function getActionsAvailable(intent: string, hasItems: boolean): string[] {
  if (!hasItems) return [];
  const base = [ACTIONS_ENUM.SAVE_VIEW];
  switch (intent) {
    case "deals_at_risk":
    case "deals_inactive":
    case "deals_no_next_step":
      return [ACTIONS_ENUM.CREATE_TASKS_BULK, ...base, ACTIONS_ENUM.ASSIGN_OWNER_BULK];
    case "deals_stuck_in_stage":
    case "stage_bottleneck":
      return [ACTIONS_ENUM.MOVE_STAGE_BULK, ACTIONS_ENUM.CREATE_TASKS_BULK, ...base, ACTIONS_ENUM.CREATE_AUTOMATION_FROM_TEMPLATE];
    case "high_value_deals":
      return [...base, ACTIONS_ENUM.ASSIGN_OWNER_BULK];
    case "closing_soon":
    case "forecast_summary":
    case "forecast_risk":
    case "pipeline_summary":
      return [ACTIONS_ENUM.NAVIGATE, ...base];
    default:
      return [ACTIONS_ENUM.NAVIGATE];
  }
}

// --- Main handler ---
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

    // --- Hybrid: Try deterministic first, fallback to LLM ---
    let intent: string;
    let days: number;
    let confidence: number;
    let routedVia: "deterministic" | "llm";

    const keywordResult = classifyByKeyword(question);

    // --- Automation intent: always route to LLM for structured extraction ---
    if (keywordResult?.intent === "create_automation_rule") {
      const detectedObjectType = detectAutomationObjectType(question);
      const automationResponse = await handleAutomationIntent(question, workspaceId, claimsData.claims.sub, serviceClient, detectedObjectType);
      return new Response(JSON.stringify(automationResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keywordResult && keywordResult.confidence >= 0.75) {
      intent = keywordResult.intent;
      days = keywordResult.days;
      confidence = keywordResult.confidence;
      routedVia = "deterministic";
    } else {
      // LLM fallback
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
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You classify CRM revenue questions into intents. Return ONLY structured output via tool call.

Available intents: deals_at_risk, deals_inactive, closing_soon, forecast_summary, forecast_risk, pipeline_summary, contacts_inactive, stage_bottleneck, deals_no_next_step, deals_stuck_in_stage, high_value_deals, overdue_invoices, pending_approvals

Intent descriptions:
- deals_at_risk: deals with low health scores
- deals_inactive: deals with no recent activity (default 14 days)
- closing_soon: deals expected to close within N days (default 30)
- forecast_summary: revenue forecast overview
- forecast_risk: deals blocking/slipping forecast (unhealthy + closing soon)
- pipeline_summary / pipeline_health_summary: pipeline stage distribution and health
- contacts_inactive: contacts without recent activity
- stage_bottleneck: stages where deals are stuck longer than expected
- deals_no_next_step: deals without a defined next action
- deals_stuck_in_stage: deals staying too long in current stage
- high_value_deals: top deals by value
- overdue_invoices: invoices past due date
- pending_approvals: items waiting for approval

Allowed filter fields per object_type:
- deals: ${ALLOWED_FIELDS.deals.join(", ")}
- contacts: ${ALLOWED_FIELDS.contacts.join(", ")}
- companies: ${ALLOWED_FIELDS.companies.join(", ")}

Allowed operators: ${ALLOWED_OPS.join(", ")}
Allowed sort fields: ${ALLOWED_SORT_FIELDS.join(", ")}

Always call the tool. Only use allowed fields, operators, and sort fields.`,
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
        const fallbackQuery = buildStructuredQuery("unknown", 14);
        return new Response(
          JSON.stringify(buildResponse("unknown", "deals", fallbackQuery, "llm", 0, {
            headline: "I couldn't process that question.",
            items: [],
            actions: [],
            did_you_mean: DID_YOU_MEAN_DEFAULTS,
          })),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        const fallbackQuery = buildStructuredQuery("unknown", 14);
        return new Response(
          JSON.stringify(buildResponse("unknown", "deals", fallbackQuery, "llm", 0, {
            headline: "I'm not sure what you mean.",
            items: [],
            actions: [],
            did_you_mean: DID_YOU_MEAN_DEFAULTS,
          })),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let parsed: any;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        const fallbackQuery = buildStructuredQuery("unknown", 14);
        return new Response(
          JSON.stringify(buildResponse("unknown", "deals", fallbackQuery, "llm", 0, {
            headline: "I'm not sure what you mean.",
            items: [],
            actions: [],
            did_you_mean: DID_YOU_MEAN_DEFAULTS,
          })),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate LLM output
      const objectType = parsed.object_type || "deals";
      if (!validateLLMFilters(parsed.filters, objectType) || !validateLLMSort(parsed.sort)) {
        const fallbackQuery = buildStructuredQuery("unknown", 14);
        return new Response(
          JSON.stringify(buildResponse("unknown", "deals", fallbackQuery, "llm", 0, {
            headline: "I couldn't build a valid query for that.",
            items: [],
            actions: [],
            did_you_mean: DID_YOU_MEAN_DEFAULTS,
          })),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      intent = parsed.intent;
      days = parsed.days ?? (intent === "closing_soon" ? 30 : 14);
      confidence = 0.70;
      routedVia = "llm";
    }

    // --- Build structured query ---
    const query = buildStructuredQuery(intent, days);
    // Clamp limit
    query.limit = Math.max(1, Math.min(100, query.limit));

    // --- Execute query based on intent ---
    const handlerResult = await executeIntent(serviceClient, workspaceId, intent, days);

    // Derive actions_available
    const hasItems = (handlerResult.items?.length || 0) > 0;
    const actionsAvailable = getActionsAvailable(intent, hasItems);

    // --- Build strict response ---
    const response = buildResponse(
      intent,
      query.object_type,
      query,
      routedVia,
      confidence,
      {
        headline: handlerResult.headline || handlerResult.header || "",
        subtext: handlerResult.subtext,
        items: handlerResult.items,
        actions: handlerResult.actions,
        actions_available: actionsAvailable,
        metric: handlerResult.metric,
        suggestion: handlerResult.suggestion,
        did_you_mean: handlerResult.did_you_mean,
      }
    );

    // --- Log query (non-blocking) ---
    serviceClient
      .from("ask_fastcrm_query_logs")
      .insert({
        workspace_id: workspaceId,
        user_id: claimsData.claims.sub,
        question,
        intent,
        items_count: response.items?.length ?? 0,
        routed_via: routedVia,
        confidence,
      })
      .then(({ error: logErr }: any) => {
        if (logErr) console.error("ask-fastcrm log error:", logErr);
      });

    return new Response(JSON.stringify(response), {
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

// --- Multi-Object Automation Config ---

type AutomationObjectType = "deal" | "contact" | "invoice";

const AUTOMATION_OBJECT_CONFIG: Record<AutomationObjectType, {
  triggers: string[];
  actions: string[];
  condition_fields: string[];
  requires_extension?: string;
}> = {
  deal: {
    triggers: ["opportunity_stage_changed", "lead_no_response", "lead_score_changed", "lead_temperature_changed"],
    actions: ["create_task", "assign_owner", "notify_user", "move_opportunity_stage"],
    condition_fields: ["amount", "stage", "health_label", "close_date", "owner_id"],
  },
  contact: {
    triggers: ["contact_created", "contact_updated", "contact_no_activity", "contact_score_changed"],
    actions: ["create_task", "assign_owner", "notify_user"],
    condition_fields: ["name", "email", "owner_id"],
  },
  invoice: {
    triggers: ["invoice_created", "invoice_overdue", "due_date_approaching", "invoice_status_changed"],
    actions: ["create_task", "notify_user", "mark_as_at_risk", "send_overdue_alert"],
    condition_fields: ["amount", "status", "days_overdue", "due_date"],
    requires_extension: "invoices",
  },
};

const ALL_AUTOMATION_TRIGGERS = Object.values(AUTOMATION_OBJECT_CONFIG).flatMap(c => c.triggers);
const ALL_AUTOMATION_ACTIONS = Object.values(AUTOMATION_OBJECT_CONFIG).flatMap(c => c.actions);
const ALL_AUTOMATION_CONDITION_FIELDS = [...new Set(Object.values(AUTOMATION_OBJECT_CONFIG).flatMap(c => c.condition_fields))];

function detectAutomationObjectType(question: string): AutomationObjectType {
  const lower = question.toLowerCase();
  const invoiceKeywords = ["invoice", "fatura", "overdue", "vencida", "due date", "data de vencimento"];
  const contactKeywords = ["contact", "contacto", "replied", "reply", "resposta", "respondeu"];
  if (invoiceKeywords.some(k => lower.includes(k))) return "invoice";
  if (contactKeywords.some(k => lower.includes(k))) return "contact";
  return "deal";
}

const AUTOMATION_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_automation_rule",
    description: "Extract a structured automation rule from a natural language CRM request. Supports deals, contacts, and invoices.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short descriptive name for the rule (max 60 chars)" },
        object_type: {
          type: "string",
          enum: ["deal", "contact", "invoice"],
          description: "The object type this rule applies to.",
        },
        trigger: {
          type: "string",
          enum: ALL_AUTOMATION_TRIGGERS,
          description: "The event that triggers this rule.",
        },
        trigger_config: {
          type: "object",
          properties: {
            delay_days: { type: "number", description: "Number of days for inactivity/approaching triggers" },
            stage_name: { type: "string", description: "Stage name for stage-change triggers" },
            days_overdue: { type: "number", description: "Number of overdue days for invoice triggers" },
            days_before_due: { type: "number", description: "Days before due date for approaching triggers" },
            status: { type: "string", description: "Status value for status-change triggers" },
          },
        },
        trigger_label: { type: "string", description: "Human-readable description of the trigger" },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field_name: { type: "string", enum: ALL_AUTOMATION_CONDITION_FIELDS },
              operator: { type: "string", enum: ["equals", "not_equals", "greater_than", "less_than", "is_empty"] },
              value: { type: "string" },
            },
            required: ["field_name", "operator", "value"],
          },
        },
        conditions_labels: {
          type: "array",
          items: { type: "string" },
          description: "Human-readable descriptions of each condition",
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action_type: { type: "string", enum: ALL_AUTOMATION_ACTIONS },
              config: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  due_in_days: { type: "number" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  message: { type: "string" },
                  stage_name: { type: "string" },
                },
              },
            },
            required: ["action_type", "config"],
          },
        },
        actions_labels: {
          type: "array",
          items: { type: "string" },
          description: "Human-readable descriptions of each action",
        },
      },
      required: ["name", "object_type", "trigger", "trigger_label", "actions", "actions_labels"],
      additionalProperties: false,
    },
  },
};

const AUTOMATION_DID_YOU_MEAN: Record<AutomationObjectType, string[]> = {
  deal: ["Remind me if no activity for 7 days", "Create follow-up when deal enters Proposal", "Alert me when deals are at risk"],
  contact: ["Notify me if contact hasn't replied in 14 days", "Create task when new contact is created", "Assign new contacts to SDR team"],
  invoice: ["Alert me when invoice is overdue", "Notify owner 3 days before due date", "Mark invoice as at risk if overdue 10 days"],
};

async function handleAutomationIntent(question: string, workspaceId: string, userId: string, serviceClient: any, detectedObjectType: AutomationObjectType) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return buildResponse("create_automation_rule", "deals",
      { filters: [], sort: [], limit: 0 }, "llm", 0,
      { headline: "AI not configured.", items: [], actions: [], did_you_mean: DID_YOU_MEAN_DEFAULTS }
    );
  }

  // Extension gate for invoices
  if (detectedObjectType === "invoice") {
    const { data: modulesData } = await serviceClient
      .from("workspace_modules")
      .select("id, module_id")
      .eq("workspace_id", workspaceId)
      .in("status", ["active", "trial"]);

    let hasInvoiceModule = false;
    if (modulesData && modulesData.length > 0) {
      const moduleIds = modulesData.map((m: any) => m.module_id);
      const { data: marketplaceModules } = await serviceClient
        .from("marketplace_modules")
        .select("id, slug")
        .in("id", moduleIds);
      hasInvoiceModule = marketplaceModules?.some((m: any) => m.slug === "invoices") || false;
    }

    if (!hasInvoiceModule) {
      return {
        version: "1.0",
        routed_via: "llm" as const,
        confidence: 0.90,
        intent: "create_automation_rule",
        object_type: "deals",
        query: { filters: [], sort: [], limit: 0 },
        answer: {
          headline: "Invoice automations require the Finance Pack.",
          subtext: "Activate it in Marketplace to unlock invoice rules.",
        },
        actions_available: [],
        items: [],
        actions: [],
        did_you_mean: AUTOMATION_DID_YOU_MEAN.deal,
      };
    }
  }

  const objectConfig = AUTOMATION_OBJECT_CONFIG[detectedObjectType];
  const objectLabel = detectedObjectType === "deal" ? "Deal" : detectedObjectType === "contact" ? "Contact" : "Invoice";

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You extract automation rules from natural language CRM requests. The user wants to create an automated rule.

The detected object type is: ${detectedObjectType}

Allowed triggers for ${detectedObjectType}:
${objectConfig.triggers.map(t => `- ${t}`).join("\n")}

Allowed actions for ${detectedObjectType}:
${objectConfig.actions.map(a => `- ${a}`).join("\n")}

Allowed condition fields for ${detectedObjectType}: ${objectConfig.condition_fields.join(", ")}
Allowed condition operators: equals, not_equals, greater_than, less_than, is_empty

Trigger descriptions:
- opportunity_stage_changed: deal moves to a specific stage (use trigger_config.stage_name)
- lead_no_response: no activity for N days (use trigger_config.delay_days)
- lead_score_changed / lead_temperature_changed: score/temperature changes
- contact_created: new contact is created
- contact_updated: contact is updated
- contact_no_activity: no activity on contact for N days (use trigger_config.delay_days)
- contact_score_changed: contact score changes
- invoice_created: new invoice is created
- invoice_overdue: invoice is past due date (use trigger_config.days_overdue)
- due_date_approaching: invoice due date is approaching (use trigger_config.days_before_due)
- invoice_status_changed: invoice status changes (use trigger_config.status)

Action descriptions:
- create_task: creates a follow-up task (config: title, due_in_days, priority)
- assign_owner: assigns to a user (config: message describing who)
- notify_user: sends a notification (config: message)
- move_opportunity_stage: moves deal to another stage (config: stage_name)
- mark_as_at_risk: flags entity as at risk (no config needed)
- send_overdue_alert: sends overdue alert (config: message)

IMPORTANT: Set object_type to "${detectedObjectType}". Only use triggers and actions listed above for this object type.
Always call the tool. Generate clear human-readable labels. Keep names short.`,
          },
          { role: "user", content: question },
        ],
        tools: [AUTOMATION_TOOL],
        tool_choice: { type: "function", function: { name: "extract_automation_rule" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error for automation:", aiResponse.status);
      return buildResponse("create_automation_rule", "deals",
        { filters: [], sort: [], limit: 0 }, "llm", 0,
        { headline: "Couldn't understand that automation request.", items: [], actions: [], did_you_mean: AUTOMATION_DID_YOU_MEAN[detectedObjectType] }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return buildResponse("create_automation_rule", "deals",
        { filters: [], sort: [], limit: 0 }, "llm", 0,
        { headline: "Couldn't parse that as an automation rule.", items: [], actions: [], did_you_mean: AUTOMATION_DID_YOU_MEAN[detectedObjectType] }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return buildResponse("create_automation_rule", "deals",
        { filters: [], sort: [], limit: 0 }, "llm", 0,
        { headline: "Couldn't parse automation rule.", items: [], actions: [], did_you_mean: DID_YOU_MEAN_DEFAULTS }
      );
    }

    // Resolve object type — prefer LLM output but validate
    const resolvedObjectType: AutomationObjectType = (["deal", "contact", "invoice"] as const).includes(parsed.object_type) ? parsed.object_type : detectedObjectType;
    const resolvedConfig = AUTOMATION_OBJECT_CONFIG[resolvedObjectType];

    // Guardrails: validate trigger belongs to resolved object
    if (!resolvedConfig.triggers.includes(parsed.trigger)) {
      return buildResponse("create_automation_rule", "deals",
        { filters: [], sort: [], limit: 0 }, "llm", 0.3,
        { headline: `That trigger isn't supported for ${resolvedObjectType}s.`, items: [], actions: [], did_you_mean: AUTOMATION_DID_YOU_MEAN[resolvedObjectType] }
      );
    }

    // Guardrails: validate actions belong to resolved object
    const validActions = (parsed.actions || []).filter((a: any) => resolvedConfig.actions.includes(a.action_type));
    if (validActions.length === 0) {
      return buildResponse("create_automation_rule", "deals",
        { filters: [], sort: [], limit: 0 }, "llm", 0.3,
        { headline: `That action isn't supported for ${resolvedObjectType}s.`, items: [], actions: [], did_you_mean: AUTOMATION_DID_YOU_MEAN[resolvedObjectType] }
      );
    }

    // Guardrails: validate conditions
    const validConditions = (parsed.conditions || []).filter((c: any) => resolvedConfig.condition_fields.includes(c.field_name));

    // Server-side plan gating: check workspace subscription for condition/action limits
    let planNote = "";
    try {
      const { data: subData } = await serviceClient
        .from("workspace_subscriptions")
        .select("plan")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const wsPlan = subData?.plan || "starter";
      if (wsPlan === "starter") {
        // Starter: max 1 condition, max 1 action
        if (validConditions.length > 1) validConditions.length = 1;
        if (validActions.length > 1) validActions.length = 1;
        planNote = "Your plan supports 1 condition and 1 action per rule.";
      } else if (wsPlan === "growth") {
        // Growth: multi-conditions allowed, but max 1 action
        if (validActions.length > 1) validActions.length = 1;
      }
    } catch (e) {
      console.error("Plan check error in automation:", e);
    }

    // Build automation_preview response
    const automationPreview = {
      name: (parsed.name || "New automation rule").slice(0, 60),
      object_type: resolvedObjectType,
      trigger: parsed.trigger,
      trigger_config: parsed.trigger_config || {},
      trigger_label: parsed.trigger_label || parsed.trigger,
      conditions: validConditions,
      conditions_labels: parsed.conditions_labels || validConditions.map((c: any) => `${c.field_name} ${c.operator} ${c.value}`),
      actions: validActions,
      actions_labels: parsed.actions_labels || validActions.map((a: any) => a.action_type),
    };

    // Log (non-blocking)
    serviceClient
      .from("ask_fastcrm_query_logs")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        question,
        intent: "create_automation_rule",
        items_count: 0,
        routed_via: "llm",
        confidence: 0.85,
      })
      .then(({ error: logErr }: any) => {
        if (logErr) console.error("ask-fastcrm automation log error:", logErr);
      });

    return {
      version: "1.0",
      routed_via: "llm",
      confidence: 0.85,
      intent: "create_automation_rule",
      object_type: "deals",
      query: { filters: [], sort: [], limit: 0 },
      answer: {
        headline: `You're creating a new automation for ${objectLabel}s.`,
        subtext: planNote || "Review the details below and confirm.",
      },
      actions_available: ["CONFIRM_AUTOMATION", "CANCEL"],
      items: [],
      actions: [],
      automation_preview: automationPreview,
    };
  } catch (e) {
    console.error("Automation intent error:", e);
    return buildResponse("create_automation_rule", "deals",
      { filters: [], sort: [], limit: 0 }, "llm", 0,
      { headline: "Something went wrong creating the rule.", items: [], actions: [], did_you_mean: DID_YOU_MEAN_DEFAULTS }
    );
  }
}

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
    case "forecast_risk":
      return await queryForecastRisk(client, workspaceId);
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
        headline: "Pending approvals — coming soon.",
        items: [],
        actions: [],
        metric: { label: "Approvals", value: "—", trend: "neutral" as const },
      };
    default:
      return {
        headline: "I couldn't understand that question.",
        items: [],
        actions: [],
        did_you_mean: DID_YOU_MEAN_DEFAULTS,
      };
  }
}

// ---- Intent Handlers ----
// Each returns { headline, subtext?, items, actions, metric?, suggestion? }

async function queryDealsAtRisk(client: any, workspaceId: string) {
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
    headline: items.length > 0
      ? `${items.length} deal${items.length !== 1 ? "s" : ""} currently at risk.`
      : "No deals at risk right now.",
    subtext: items.length > 0 ? "Most are missing activity and next steps." : undefined,
    items,
    actions: items.length > 0
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
    return { headline: "No open deals found.", items: [], actions: [] };
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
    text: `${inactive.length} deal${inactive.length !== 1 ? "s" : ""} with no activity in ${days}+ days.`,
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
    headline: inactive.length > 0
      ? `${inactive.length} deal${inactive.length !== 1 ? "s" : ""} with no activity in ${days}+ days.`
      : `All deals had activity in the last ${days} days.`,
    subtext: inactive.length > 0 ? "These deals may need immediate attention." : undefined,
    items: inactive,
    actions: inactive.length > 0
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
    headline: items.length > 0
      ? `${items.length} deal${items.length !== 1 ? "s" : ""} closing in the next ${days} days.`
      : `No deals closing in the next ${days} days.`,
    subtext: items.length > 0 ? `Total expected: €${totalValue.toLocaleString()}.` : undefined,
    items,
    actions: items.length > 0
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
    .order("generated_at", { ascending: false })
    .limit(1);

  const forecast = data?.[0];
  if (!forecast) {
    return {
      headline: "No forecast data available yet.",
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

  const gross = forecast.best_case ?? 0;
  const expected = forecast.expected_case ?? 0;
  const stageWeighted = forecast.stage_weighted ?? 0;
  const riskAdjusted = forecast.health_adjusted_expected ?? 0;
  const confidence = forecast.forecast_confidence ?? 0;
  const blockers: string[] = forecast.blockers ?? [];

  const fmt = (v: number) => `€${Math.round(v).toLocaleString()}`;

  const confidenceText = confidence >= 70 ? "high confidence" : confidence >= 40 ? "moderate confidence" : "low confidence";
  const isRealistic = confidence >= 60;

  return {
    headline: `Forecast: ${fmt(riskAdjusted)} risk-adjusted (${confidenceText}).`,
    subtext: !isRealistic ? "Data quality issues may affect accuracy." : `Stage-weighted: ${fmt(stageWeighted)}`,
    items: [
      {
        id: "gross",
        title: "Gross (Pipeline Total)",
        subtitle: fmt(gross),
        value: gross,
        link: "/dashboard/opportunities",
      },
      {
        id: "stage_weighted",
        title: "Stage-Weighted",
        subtitle: fmt(stageWeighted),
        value: stageWeighted,
        link: "/dashboard/opportunities",
      },
      {
        id: "risk_adjusted",
        title: "Risk-Adjusted",
        subtitle: fmt(riskAdjusted),
        value: riskAdjusted,
        link: "/dashboard/opportunities",
      },
      ...blockers.slice(0, 3).map((b, i) => ({
        id: `blocker_${i}`,
        title: "⚠ Blocker",
        subtitle: b,
        value: 0,
        link: "/dashboard/opportunities",
      })),
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
      label: "Confidence",
      value: `${confidence}%`,
      trend: confidence >= 60 ? "up" : "down",
    },
  };
}

// NEW: forecast_risk intent
async function queryForecastRisk(client: any, workspaceId: string) {
  const now = new Date();
  const forecastEnd = new Date(now.getTime() + 90 * 86400000).toISOString();

  // Get deals closing in forecast period
  const { data: opps } = await client
    .from("opportunities")
    .select("id, title, value, expected_close_date")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .lte("expected_close_date", forecastEnd)
    .gte("expected_close_date", now.toISOString())
    .order("value", { ascending: false })
    .limit(50);

  if (!opps || opps.length === 0) {
    return {
      headline: "No deals in the forecast period.",
      items: [],
      actions: [],
    };
  }

  const oppIds = opps.map((o: any) => o.id);

  // Get health from intelligence cache
  const { data: cache } = await client
    .from("deal_intelligence_cache")
    .select("deal_id, payload")
    .eq("workspace_id", workspaceId)
    .in("deal_id", oppIds)
    .is("invalidated_at", null)
    .gt("expires_at", now.toISOString());

  const healthMap = new Map((cache || []).map((c: any) => [c.deal_id, c.payload]));

  const atRiskDeals = opps
    .filter((o: any) => {
      const health = healthMap.get(o.id);
      return health && health.health_label !== "HEALTHY";
    })
    .map((o: any) => {
      const health = healthMap.get(o.id);
      const daysLeft = differenceInDays(new Date(o.expected_close_date), now);
      return {
        id: o.id,
        title: o.title || "Untitled Deal",
        subtitle: `${health?.health_label || "WATCH"} · Closes in ${daysLeft}d · ${health?.top_reason || ""}`,
        value: Number(o.value) || 0,
        health_label: health?.health_label || "WATCH",
        link: `/dashboard/opportunities?deal=${o.id}`,
      };
    })
    .slice(0, 10);

  const totalAtRiskValue = atRiskDeals.reduce((s: number, i: any) => s + i.value, 0);

  return {
    headline: atRiskDeals.length > 0
      ? `${atRiskDeals.length} deal${atRiskDeals.length !== 1 ? "s" : ""} blocking your forecast.`
      : "No unhealthy deals in the forecast period.",
    subtext: atRiskDeals.length > 0 ? `€${totalAtRiskValue.toLocaleString()} at risk value.` : undefined,
    items: atRiskDeals,
    actions: atRiskDeals.length > 0
      ? [
          {
            id: "create_tasks_all",
            label: "Create follow-ups",
            icon: "ListTodo",
            type: "bulk_task",
            payload: {
              deal_ids: atRiskDeals.map((i) => i.id),
              task_title: "Address forecast risk",
              priority: "HIGH",
            },
          },
          {
            id: "save_view",
            label: "Save as view",
            icon: "Bookmark",
            type: "create_saved_view",
            payload: {
              view_name: "Forecast Risk Deals",
              object_type_id: "opportunity",
              filters: { health_label_not: "HEALTHY", close_date_within: "90d" },
              columns: ["title", "value", "health_label", "expected_close_date"],
            },
          },
          {
            id: "view_as_list",
            label: "View pipeline",
            icon: "Eye",
            type: "navigate",
            payload: { link: "/dashboard/opportunities" },
          },
        ]
      : [],
    metric: {
      label: "At Risk Value",
      value: `€${totalAtRiskValue.toLocaleString()}`,
      trend: atRiskDeals.length > 0 ? "down" : "neutral",
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
    headline: `${totalDeals} open deal${totalDeals !== 1 ? "s" : ""} worth €${totalValue.toLocaleString()}.`,
    subtext: items.length > 0 ? `Distributed across ${items.length} stages.` : undefined,
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
    headline: items.length > 0
      ? `${items.length} contact${items.length !== 1 ? "s" : ""} without activity in ${days}+ days.`
      : `All contacts had updates in the last ${days} days.`,
    items,
    actions: items.length > 0
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
    return { headline: "No pipeline data available.", items: [], actions: [] };
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
    headline: items.length > 0
      ? `${items.length} stage${items.length !== 1 ? "s" : ""} with bottlenecks.`
      : "No stage bottlenecks detected.",
    subtext: items.length > 0 ? "Deals are staying longer than expected." : undefined,
    items,
    actions: items.length > 0
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
      headline: "All open deals have a next step defined.",
      items: [],
      actions: [],
      metric: { label: "No Next Step", value: "0", trend: "neutral" },
    };
  }

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
    text: `${items.length} deal${items.length !== 1 ? "s" : ""} have no next step.`,
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
    headline: `${items.length} deal${items.length !== 1 ? "s" : ""} without a next step.`,
    subtext: "These deals need defined next actions.",
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
    return { headline: "No pipeline data available.", items: [], actions: [] };
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
    headline: stuck.length > 0
      ? `${stuck.length} deal${stuck.length !== 1 ? "s" : ""} stuck in their current stage.`
      : "No deals stuck beyond expected stage duration.",
    subtext: stuck.length > 0 ? "Consider advancing or re-engaging these deals." : undefined,
    items: stuck,
    actions: stuck.length > 0
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
    headline: items.length > 0
      ? `Top ${items.length} deals worth €${totalValue.toLocaleString()}.`
      : "No open deals found.",
    subtext: items.length > 0 ? "Your highest-value open opportunities." : undefined,
    items,
    actions: items.length > 0
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
      headline: "Invoicing extension is not active.",
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
      headline: items.length > 0
        ? `${items.length} overdue invoice${items.length !== 1 ? "s" : ""} totaling €${totalOverdue.toLocaleString()}.`
        : "No overdue invoices.",
      items,
      actions: items.length > 0
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
      headline: "Invoice data is not available yet.",
      items: [],
      actions: [],
      metric: { label: "Overdue", value: "—", trend: "neutral" },
    };
  }
}
