import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AIModule =
  | "copilot"
  | "content_generation"
  | "lead_analysis"
  | "diagnostic"
  | "autofill"
  | "context_ai"
  | "conversational_engine"
  | "agents";

export type AIProvider = "lovable" | "claude";

export interface AIModuleConfig {
  provider: AIProvider;
  model?: string;
}

export interface AIProviderConfig {
  defaultProvider: AIProvider;
  claudeModel: string;
  lovableModel: string;
  claudeEnabled: boolean;
  modules: Record<AIModule, AIModuleConfig>;
}

const MODULE_LABELS: Record<AIModule, { label: string; description: string }> = {
  copilot: { label: "Copilot (Inbox)", description: "Classificação de intenção, sugestões de resposta, resumos" },
  content_generation: { label: "Geração de Conteúdo", description: "Emails, landing pages, propostas" },
  lead_analysis: { label: "Análise de Leads", description: "Enriquecimento, scoring, agentes AI" },
  diagnostic: { label: "Diagnóstico B2B", description: "Assistente de diagnóstico do portal cliente" },
  autofill: { label: "AI Autofill", description: "Preenchimento automático de campos" },
  context_ai: { label: "Context AI", description: "Sugestões de campos e ações no Context Builder" },
  conversational_engine: { label: "Motor Conversacional", description: "Chatbots, personas, fluxos conversacionais" },
  agents: { label: "AI Agents", description: "Operadores SDR, Rescue, Upsell, Scorer" },
};

export { MODULE_LABELS };

const DEFAULT_CONFIG: AIProviderConfig = {
  defaultProvider: "lovable",
  claudeModel: "claude-sonnet-4-20250514",
  lovableModel: "google/gemini-3-flash-preview",
  claudeEnabled: false,
  modules: {
    copilot: { provider: "lovable" },
    content_generation: { provider: "lovable" },
    lead_analysis: { provider: "lovable" },
    diagnostic: { provider: "lovable" },
    autofill: { provider: "lovable" },
    context_ai: { provider: "lovable" },
    conversational_engine: { provider: "lovable" },
    agents: { provider: "lovable" },
  },
};

let cachedConfig: AIProviderConfig | null = null;

export function useAIProvider() {
  const [config, setConfig] = useState<AIProviderConfig>(cachedConfig || DEFAULT_CONFIG);
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) return;
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "ai_provider_config")
        .maybeSingle();

      if (data?.value) {
        const val = data.value as Record<string, unknown>;
        const loaded = {
          ...DEFAULT_CONFIG,
          ...(val as unknown as Partial<AIProviderConfig>),
          modules: {
            ...DEFAULT_CONFIG.modules,
            ...((val as any).modules || {}),
          },
        };
        cachedConfig = loaded;
        setConfig(loaded);
      }
    } catch (e) {
      console.error("Failed to load AI provider config:", e);
    } finally {
      setLoading(false);
    }
  };

  const getProviderForModule = useCallback(
    (module: AIModule): { provider: AIProvider; model: string } => {
      const moduleConfig = config.modules[module];
      const provider = moduleConfig?.provider || config.defaultProvider;

      // If Claude is not enabled, always fallback to lovable
      const effectiveProvider = provider === "claude" && !config.claudeEnabled ? "lovable" : provider;

      const model =
        moduleConfig?.model ||
        (effectiveProvider === "claude" ? config.claudeModel : config.lovableModel);

      return { provider: effectiveProvider, model };
    },
    [config]
  );

  const callAI = useCallback(
    async (
      module: AIModule,
      payload: {
        messages?: Array<{ role: string; content: string }>;
        system?: string;
        tools?: any[];
        tool_choice?: any;
        max_tokens?: number;
      }
    ) => {
      const { provider, model } = getProviderForModule(module);

      if (provider === "claude") {
        const { data, error } = await supabase.functions.invoke("claude-chat", {
          body: {
            messages: payload.messages,
            system: payload.system,
            model,
            max_tokens: payload.max_tokens || 4096,
            tools: payload.tools,
            tool_choice: payload.tool_choice,
          },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error);
        return { content: data.content, raw: data.raw, provider: "claude" as const };
      }

      // Lovable AI Gateway
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          messages: payload.messages,
          system: payload.system,
          model,
          max_tokens: payload.max_tokens,
          tools: payload.tools,
          tool_choice: payload.tool_choice,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { content: data.content, raw: data, provider: "lovable" as const };
    },
    [getProviderForModule]
  );

  const invalidateCache = useCallback(() => {
    cachedConfig = null;
  }, []);

  return {
    config,
    loading,
    getProviderForModule,
    callAI,
    invalidateCache,
    reload: loadConfig,
  };
}
