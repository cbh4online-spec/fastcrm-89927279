import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { SettingsSection, SettingsItem } from "../SettingsSection";
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
import { Bot, Sparkles, Zap, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface AIProviderConfig {
  defaultProvider: "lovable" | "claude";
  claudeModel: string;
  lovableModel: string;
  claudeEnabled: boolean;
}

const DEFAULT_CONFIG: AIProviderConfig = {
  defaultProvider: "lovable",
  claudeModel: "claude-sonnet-4-20250514",
  lovableModel: "google/gemini-3-flash-preview",
  claudeEnabled: false,
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

export function AIProviderSettings() {
  const { currentWorkspace } = useWorkspace();
  const [config, setConfig] = useState<AIProviderConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    loadConfig();
  }, [currentWorkspace?.id]);

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
        toast.success(`Claude está a funcionar! Resposta: ${data?.content?.slice(0, 50)}`);
      } else {
        const { data, error } = await supabase.functions.invoke("ai-dashboard-insights", {
          body: { test: true },
        });
        // If it doesn't throw, the gateway is reachable
        toast.success("Lovable AI está a funcionar!");
      }
    } catch (e: any) {
      toast.error(`Erro ao testar ${provider}: ${e.message || "Erro desconhecido"}`);
    } finally {
      setTesting(null);
    }
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
      description="Configura os provedores e modelos de IA utilizados no FastCRM"
      icon={<Bot className="h-5 w-5" />}
    >
      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lovable AI Card */}
        <Card className={`relative transition-all ${config.defaultProvider === "lovable" ? "ring-2 ring-primary" : ""}`}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Lovable AI</h4>
                  <p className="text-xs text-muted-foreground">Gemini & GPT-5</p>
                </div>
              </div>
              {config.defaultProvider === "lovable" && (
                <Badge variant="default" className="text-xs">Padrão</Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Modelo</Label>
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
                      <div>
                        <span>{m.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
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
              {config.defaultProvider !== "lovable" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfig((c) => ({ ...c, defaultProvider: "lovable" }))}
                >
                  Definir como padrão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claude Card */}
        <Card className={`relative transition-all ${config.defaultProvider === "claude" ? "ring-2 ring-primary" : ""}`}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Bot className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Claude (Anthropic)</h4>
                  <p className="text-xs text-muted-foreground">Sonnet, Opus & Haiku</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {config.defaultProvider === "claude" && (
                  <Badge variant="default" className="text-xs">Padrão</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Ativar Claude</Label>
              <Switch
                checked={config.claudeEnabled}
                onCheckedChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    claudeEnabled: v,
                    defaultProvider: !v && c.defaultProvider === "claude" ? "lovable" : c.defaultProvider,
                  }))
                }
              />
            </div>

            {config.claudeEnabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Modelo</Label>
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
                          <div>
                            <span>{m.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
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
                  {config.defaultProvider !== "claude" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfig((c) => ({ ...c, defaultProvider: "claude" }))}
                    >
                      Definir como padrão
                    </Button>
                  )}
                </div>
              </>
            )}

            {!config.claudeEnabled && (
              <p className="text-xs text-muted-foreground">
                Ativa o Claude para o utilizar como alternativa ao Lovable AI.
                Necessita de API key da Anthropic configurada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
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
