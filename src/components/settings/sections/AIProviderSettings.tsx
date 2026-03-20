import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsSection } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bot, Sparkles, Zap, CheckCircle, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import type { AIModule, AIProvider, AIProviderConfig } from "@/hooks/useAIProvider";
import { MODULE_LABELS } from "@/hooks/useAIProvider";

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

const CLAUDE_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", description: "Melhor relação custo/qualidade" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4", description: "Máxima qualidade" },
  { value: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5", description: "Mais rápido e económico" },
];

const LOVABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Rápido e eficiente (padrão)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Raciocínio complexo" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Equilibrado" },
  { value: "openai/gpt-5", label: "GPT-5", description: "Alta qualidade" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Equilibrado e económico" },
];

const ALL_MODULES: AIModule[] = [
  "copilot",
  "content_generation",
  "lead_analysis",
  "diagnostic",
  "autofill",
  "context_ai",
  "conversational_engine",
  "agents",
];

export function AIProviderSettings() {
  const [config, setConfig] = useState<AIProviderConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "ai_provider_config")
        .maybeSingle();

      if (!error && data?.value) {
        const val = data.value as Record<string, unknown>;
        setConfig({
          ...DEFAULT_CONFIG,
          ...(val as unknown as Partial<AIProviderConfig>),
          modules: {
            ...DEFAULT_CONFIG.modules,
            ...((val as any).modules || {}),
          },
        });
      }
    } catch (e) {
      console.error("Failed to load AI config:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("key", "ai_provider_config")
        .maybeSingle();

      const value = config as unknown as Json;

      if (existing) {
        await supabase
          .from("admin_settings")
          .update({ value, description: "AI Provider configuration" })
          .eq("key", "ai_provider_config");
      } else {
        await supabase
          .from("admin_settings")
          .insert({ key: "ai_provider_config", value, description: "AI Provider configuration" });
      }

      toast.success("Configuração de IA guardada");
    } catch (e) {
      toast.error("Erro ao guardar configuração");
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (provider: "lovable" | "claude") => {
    setTesting(provider);
    try {
      if (provider === "claude") {
        const { data, error } = await supabase.functions.invoke("claude-chat", {
          body: {
            messages: [{ role: "user", content: "Responde apenas: OK" }],
            model: config.claudeModel,
            max_tokens: 10,
          },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error);
        toast.success(`Claude OK ✓`);
      } else {
        const { data, error } = await supabase.functions.invoke("ai-router", {
          body: {
            messages: [{ role: "user", content: "Responde apenas: OK" }],
            model: config.lovableModel,
            max_tokens: 10,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Lovable AI OK ✓");
      }
    } catch (e: any) {
      toast.error(`Erro ao testar ${provider}: ${e.message || "Erro desconhecido"}`);
    } finally {
      setTesting(null);
    }
  };

  const setModuleProvider = (module: AIModule, provider: AIProvider) => {
    setConfig((c) => ({
      ...c,
      modules: {
        ...c.modules,
        [module]: { ...c.modules[module], provider },
      },
    }));
  };

  const setAllModules = (provider: AIProvider) => {
    const modules = { ...config.modules };
    for (const key of ALL_MODULES) {
      modules[key] = { ...modules[key], provider };
    }
    setConfig((c) => ({ ...c, modules, defaultProvider: provider }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SettingsSection
      title="Modelos de IA"
      description="Configura os provedores e modelos de IA por funcionalidade"
      icon={<Bot className="h-5 w-5" />}
    >
      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lovable AI */}
        <Card className="transition-all">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Lovable AI</h4>
                <p className="text-xs text-muted-foreground">Gemini & GPT-5</p>
              </div>
              <Badge variant="outline" className="ml-auto text-xs">Incluído</Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Modelo padrão</Label>
              <Select
                value={config.lovableModel}
                onValueChange={(v) => setConfig((c) => ({ ...c, lovableModel: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOVABLE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span>{m.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => testProvider("lovable")}
              disabled={testing !== null}
            >
              {testing === "lovable" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Zap className="h-3.5 w-3.5 mr-1.5" />
              )}
              Testar
            </Button>
          </CardContent>
        </Card>

        {/* Claude */}
        <Card className="transition-all">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Bot className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Claude (Anthropic)</h4>
                <p className="text-xs text-muted-foreground">Sonnet, Opus & Haiku</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Label className="text-xs">Ativo</Label>
                <Switch
                  checked={config.claudeEnabled}
                  onCheckedChange={(v) => {
                    setConfig((c) => ({ ...c, claudeEnabled: v }));
                    if (!v) {
                      // Reset all modules using Claude back to lovable
                      setAllModules("lovable");
                    }
                  }}
                />
              </div>
            </div>

            {config.claudeEnabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Modelo padrão</Label>
                  <Select
                    value={config.claudeModel}
                    onValueChange={(v) => setConfig((c) => ({ ...c, claudeModel: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAUDE_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span>{m.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testProvider("claude")}
                  disabled={testing !== null}
                >
                  {testing === "claude" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Testar
                </Button>
              </>
            )}

            {!config.claudeEnabled && (
              <p className="text-xs text-muted-foreground">
                Ativa o Claude para o utilizar em funcionalidades específicas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Module Configuration */}
      <Separator className="my-6" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Provedor por Funcionalidade</h3>
          </div>
          {config.claudeEnabled && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAllModules("lovable")}>
                Tudo Lovable AI
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAllModules("claude")}>
                Tudo Claude
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-3">
          {ALL_MODULES.map((module) => {
            const info = MODULE_LABELS[module];
            const currentProvider = config.modules[module]?.provider || "lovable";
            const isClaudeDisabled = !config.claudeEnabled;

            return (
              <div
                key={module}
                className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{info.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {currentProvider === "claude" ? (
                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-200">
                      <Bot className="h-3 w-3 mr-1" />
                      Claude
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Lovable AI
                    </Badge>
                  )}
                  <Select
                    value={currentProvider}
                    onValueChange={(v) => setModuleProvider(module, v as AIProvider)}
                    disabled={isClaudeDisabled}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lovable">Lovable AI</SelectItem>
                      <SelectItem value="claude" disabled={isClaudeDisabled}>
                        Claude
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>

        {!config.claudeEnabled && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Ativa o Claude acima para poder selecionar o provedor por funcionalidade.
          </p>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Guardar Configuração
        </Button>
      </div>
    </SettingsSection>
  );
}
