import { createClient } from "npm:@supabase/supabase-js@2";

// ── Cost estimation (per 1M tokens, USD) ──────────────────────────────────────
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
  // Lovable AI / Gemini (estimated)
  "google/gemini-3-flash-preview": { input: 0.15, output: 0.6 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.0 },
  "google/gemini-2.5-flash-lite": { input: 0.075, output: 0.3 },
  "google/gemini-3.1-pro-preview": { input: 1.25, output: 5.0 },
  // OpenAI via Lovable
  "openai/gpt-5": { input: 2.5, output: 10.0 },
  "openai/gpt-5-mini": { input: 0.4, output: 1.6 },
  "openai/gpt-5-nano": { input: 0.1, output: 0.4 },
  "openai/gpt-5.2": { input: 3.0, output: 12.0 },
};

function estimateCostUSD(model: string, tokensIn: number, tokensOut: number): number {
  const costs = MODEL_COSTS[model] ?? { input: 0.15, output: 0.6 };
  return (tokensIn / 1_000_000) * costs.input + (tokensOut / 1_000_000) * costs.output;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type AITemperatureType = "creative" | "analytical" | "balanced";
export type AIMaxTokensType = "default" | "analysis" | "generation" | "agents";

export interface AISettingsRow {
  default_model: string;
  max_tokens_default: number;
  max_tokens_analysis: number;
  max_tokens_generation: number;
  max_tokens_agents: number;
  temperature_creative: number;
  temperature_analytical: number;
  temperature_balanced: number;
  response_language: string;
  monthly_token_budget: number;
  current_month_tokens: number;
  ai_copilot_enabled: boolean;
  ai_inbox_reply_enabled: boolean;
  ai_suggestions_enabled: boolean;
  ai_employees_enabled: boolean;
  ai_agents_enabled: boolean;
  ai_sales_coach_enabled: boolean;
  ai_imo_enabled: boolean;
}

const DEFAULT_SETTINGS: AISettingsRow = {
  default_model: "google/gemini-3-flash-preview",
  max_tokens_default: 1024,
  max_tokens_analysis: 2048,
  max_tokens_generation: 4096,
  max_tokens_agents: 4096,
  temperature_creative: 0.7,
  temperature_analytical: 0.2,
  temperature_balanced: 0.4,
  response_language: "pt-PT",
  monthly_token_budget: 0,
  current_month_tokens: 0,
  ai_copilot_enabled: true,
  ai_inbox_reply_enabled: true,
  ai_suggestions_enabled: true,
  ai_employees_enabled: true,
  ai_agents_enabled: true,
  ai_sales_coach_enabled: true,
  ai_imo_enabled: true,
};

// ── Get workspace AI settings ─────────────────────────────────────────────────
export async function getAISettings(
  workspaceId: string
): Promise<AISettingsRow> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...data } as AISettingsRow;
}

// ── Check budget ──────────────────────────────────────────────────────────────
export async function checkAIBudget(
  workspaceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await getAISettings(workspaceId);
  if (settings.monthly_token_budget === 0) return { allowed: true };

  if (settings.current_month_tokens >= settings.monthly_token_budget) {
    return {
      allowed: false,
      reason: `Orçamento mensal de tokens atingido (${settings.current_month_tokens.toLocaleString()} / ${settings.monthly_token_budget.toLocaleString()})`,
    };
  }
  return { allowed: true };
}

// ── Check feature toggle ──────────────────────────────────────────────────────
export async function checkAIFeatureEnabled(
  workspaceId: string,
  feature: string
): Promise<boolean> {
  const featureMap: Record<string, keyof AISettingsRow> = {
    "ai-copilot": "ai_copilot_enabled",
    "ai-inbox-reply": "ai_inbox_reply_enabled",
    "ai-inbox-actions": "ai_inbox_reply_enabled",
    "ai-field-suggestions": "ai_suggestions_enabled",
    "ai-auto-tags": "ai_suggestions_enabled",
    "ai-automation-suggestions": "ai_suggestions_enabled",
    "ai-employee-executor": "ai_employees_enabled",
    "ai-agent-processor": "ai_agents_enabled",
    "ai-opportunity-coach": "ai_sales_coach_enabled",
    "deal-intelligence": "ai_sales_coach_enabled",
    "ai-growth-insights": "ai_imo_enabled",
  };

  const settingKey = featureMap[feature];
  if (!settingKey) return true; // Unknown features are allowed by default

  const settings = await getAISettings(workspaceId);
  return (settings[settingKey] as boolean) ?? true;
}

// ── Log AI usage (fire-and-forget) ────────────────────────────────────────────
export function logAIUsage(params: {
  workspace_id: string;
  feature: string;
  model: string;
  provider?: string;
  tokens_input: number;
  tokens_output: number;
  request_type?: string;
  latency_ms?: number;
  was_cached?: boolean;
  entity_type?: string;
  entity_id?: string;
  job_id?: string;
  was_error?: boolean;
  error_type?: string;
  user_id?: string;
}): void {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cost = estimateCostUSD(params.model, params.tokens_input, params.tokens_output);
  const tokens_total = params.tokens_input + params.tokens_output;

  // Fire-and-forget: never block the main flow
  supabase
    .from("ai_usage_logs")
    .insert({
      workspace_id: params.workspace_id,
      feature: params.feature,
      model: params.model,
      provider: params.provider ?? "lovable",
      tokens_input: params.tokens_input,
      tokens_output: params.tokens_output,
      tokens_total,
      cost_usd: cost,
      request_type: params.request_type ?? "completion",
      latency_ms: params.latency_ms ?? null,
      was_cached: params.was_cached ?? false,
      was_error: params.was_error ?? false,
      error_type: params.error_type ?? null,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      job_id: params.job_id ?? null,
      user_id: params.user_id ?? null,
    })
    .then(() => {
      // Increment monthly totals
      supabase
        .rpc("increment_ai_usage", {
          p_workspace_id: params.workspace_id,
          p_tokens: tokens_total,
          p_cost: cost,
        })
        .catch((e: Error) => console.error("[AI-INSTRUMENTATION] increment error:", e));
    })
    .catch((e: Error) => console.error("[AI-INSTRUMENTATION] log error:", e));
}

// ── Instrumented Lovable AI Gateway call ──────────────────────────────────────
// This wraps the standard fetch pattern with retry, budget check, and logging.
export async function callAIInstrumented(params: {
  workspace_id: string;
  feature: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  tools?: unknown[];
  tool_choice?: unknown;
  max_tokens?: number;
  max_tokens_type?: AIMaxTokensType;
  temperature?: number;
  temperature_type?: AITemperatureType;
  provider?: "lovable" | "claude";
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  maxRetries?: number;
}): Promise<{
  data: Record<string, unknown>;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  cost_usd: number;
}> {
  const settings = await getAISettings(params.workspace_id);

  // Budget check
  if (settings.monthly_token_budget > 0 && settings.current_month_tokens >= settings.monthly_token_budget) {
    throw new Error("Orçamento mensal de tokens atingido");
  }

  const provider = params.provider ?? "lovable";
  const model = params.model ?? settings.default_model;

  // Resolve max_tokens
  const maxTokensMap: Record<string, number> = {
    default: settings.max_tokens_default,
    analysis: settings.max_tokens_analysis,
    generation: settings.max_tokens_generation,
    agents: settings.max_tokens_agents,
  };
  const maxTokens = params.max_tokens ?? maxTokensMap[params.max_tokens_type ?? "default"];

  // Resolve temperature
  const tempMap: Record<string, number> = {
    creative: settings.temperature_creative,
    analytical: settings.temperature_analytical,
    balanced: settings.temperature_balanced,
  };
  const temperature = params.temperature ?? tempMap[params.temperature_type ?? "balanced"];

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  // Build messages
  const apiMessages: Array<{ role: string; content: string }> = [];
  if (params.system) {
    apiMessages.push({ role: "system", content: params.system });
  }
  apiMessages.push(...params.messages);

  const requestBody: Record<string, unknown> = {
    model,
    messages: apiMessages,
  };
  if (maxTokens) requestBody.max_tokens = maxTokens;
  if (temperature !== undefined) requestBody.temperature = temperature;
  if (params.tools) requestBody.tools = params.tools;
  if (params.tool_choice) requestBody.tool_choice = params.tool_choice;

  const maxRetries = params.maxRetries ?? 2;
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Don't retry on 4xx except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const latencyMs = Date.now() - startTime;
          logAIUsage({
            workspace_id: params.workspace_id,
            feature: params.feature,
            model,
            provider,
            tokens_input: 0,
            tokens_output: 0,
            latency_ms: latencyMs,
            was_error: true,
            error_type: response.status === 402 ? "payment_required" : "client_error",
            user_id: params.user_id,
          });
          throw new Error(response.status === 429
            ? "Rate limit exceeded"
            : response.status === 402
            ? "Créditos AI esgotados"
            : `AI gateway error: ${response.status}`);
        }

        // Retry on 429 or 5xx
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        logAIUsage({
          workspace_id: params.workspace_id,
          feature: params.feature,
          model,
          provider,
          tokens_input: 0,
          tokens_output: 0,
          latency_ms: Date.now() - startTime,
          was_error: true,
          error_type: response.status === 429 ? "rate_limit" : "api_error",
          user_id: params.user_id,
        });
        throw new Error(`AI gateway error after ${maxRetries + 1} attempts: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      // Extract token usage from OpenAI-compatible response
      const tokensInput = data.usage?.prompt_tokens ?? 0;
      const tokensOutput = data.usage?.completion_tokens ?? 0;
      const costUsd = estimateCostUSD(model, tokensInput, tokensOutput);

      // Log success (fire-and-forget)
      logAIUsage({
        workspace_id: params.workspace_id,
        feature: params.feature,
        model,
        provider,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        request_type: params.tools ? "tool_use" : "completion",
        latency_ms: latencyMs,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        user_id: params.user_id,
      });

      return { data, tokens_input: tokensInput, tokens_output: tokensOutput, latency_ms: latencyMs, cost_usd: costUsd };
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries && !(error as Error).message?.includes("Créditos")) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}
