/**
 * Global Settings Tab - Functional AI configuration panel
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Settings, Brain, Wallet, Zap, SlidersHorizontal, Globe, Loader2, Save } from "lucide-react";
import { useAISettings, useUpdateAISettings } from "@/hooks/useAISettings";
import { toast } from "@/hooks/use-toast";
import type { AISettings } from "@/types/ai-settings";

const AVAILABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Rápido)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Equilibrado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avançado)" },
  { value: "openai/gpt-5", label: "GPT-5 (Premium)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Custo-eficiente)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (Ultra-rápido)" },
];

const LANGUAGES = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

type FeatureToggle = {
  key: keyof AISettings;
  label: string;
  description: string;
};

const FEATURE_TOGGLES: FeatureToggle[] = [
  { key: "ai_copilot_enabled", label: "AI Copilot", description: "Assistente contextual em toda a plataforma" },
  { key: "ai_inbox_reply_enabled", label: "Respostas Inbox", description: "Sugestões automáticas de resposta" },
  { key: "ai_suggestions_enabled", label: "Sugestões de Campos", description: "Preenchimento inteligente de dados" },
  { key: "ai_agents_enabled", label: "AI Agents", description: "Agentes autónomos de execução" },
  { key: "ai_employees_enabled", label: "AI Employees", description: "Empregados virtuais com personas" },
  { key: "ai_sales_coach_enabled", label: "Sales Coach", description: "Coaching de vendas em tempo real" },
  { key: "ai_imo_enabled", label: "IMO AI", description: "Intelligence & Market Operations" },
];

export function GlobalSettingsTab() {
  const { data: settings, isLoading } = useAISettings();
  const updateMutation = useUpdateAISettings();

  const [form, setForm] = useState<Partial<AISettings>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
      setDirty(false);
    }
  }, [settings]);

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      setDirty(false);
      toast({ title: "Definições guardadas", description: "As configurações de IA foram atualizadas." });
    } catch {
      toast({ title: "Erro ao guardar", description: "Tenta novamente.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const budgetUsedPct =
    form.monthly_token_budget && form.monthly_token_budget > 0
      ? Math.min(100, Math.round(((form.current_month_tokens ?? 0) / form.monthly_token_budget) * 100))
      : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-medium">Definições Globais de IA</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Estas definições controlam o comportamento padrão de todos os módulos de IA do workspace.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Model & Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Modelo & Idioma Padrão
          </CardTitle>
          <CardDescription>Modelo de IA e idioma utilizados quando não há override</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Modelo Padrão</Label>
            <Select value={form.default_model ?? ""} onValueChange={(v) => update("default_model", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar modelo" /></SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Idioma de Resposta</Label>
            <Select value={form.response_language ?? "pt"} onValueChange={(v) => update("response_language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-sm font-medium">Temperaturas</Label>
            {([
              { key: "temperature_creative" as const, label: "Criativo", desc: "Respostas mais variadas e originais" },
              { key: "temperature_analytical" as const, label: "Analítico", desc: "Respostas precisas e factuais" },
              { key: "temperature_balanced" as const, label: "Equilibrado", desc: "Balanço entre criatividade e precisão" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm">{label}</span>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground w-10 text-right">
                    {(form[key] ?? 0.7).toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[form[key] ?? 0.7]}
                  min={0}
                  max={1.5}
                  step={0.1}
                  onValueChange={([v]) => update(key, Number(v.toFixed(1)))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Orçamento & Limites
          </CardTitle>
          <CardDescription>Controlo de custos e alertas de consumo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Budget Mensal de Tokens</Label>
            <Input
              type="number"
              min={0}
              step={100000}
              value={form.monthly_token_budget ?? 0}
              onChange={(e) => update("monthly_token_budget", Number(e.target.value))}
              placeholder="Ex: 5000000"
            />
          </div>

          {(form.monthly_token_budget ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Consumo este mês</span>
                <span className="font-mono">
                  {((form.current_month_tokens ?? 0) / 1000).toFixed(0)}K / {((form.monthly_token_budget ?? 0) / 1000).toFixed(0)}K tokens ({budgetUsedPct}%)
                </span>
              </div>
              <Progress value={budgetUsedPct} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span>Custo acumulado do mês</span>
            <span className="font-mono font-medium">${(form.current_month_cost_usd ?? 0).toFixed(4)}</span>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Alerta de Threshold</Label>
              <span className="text-sm font-mono text-muted-foreground">{form.budget_alert_threshold ?? 80}%</span>
            </div>
            <Slider
              value={[form.budget_alert_threshold ?? 80]}
              min={50}
              max={100}
              step={5}
              onValueChange={([v]) => update("budget_alert_threshold", v)}
            />
            <p className="text-xs text-muted-foreground">Recebe um alerta quando o consumo atingir esta percentagem do budget</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Funcionalidades IA Ativas
          </CardTitle>
          <CardDescription>Ativa ou desativa módulos de IA para todo o workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FEATURE_TOGGLES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label>{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={!!(form[key])}
                onCheckedChange={(v) => update(key, v as any)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Max Tokens per Operation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Tokens por Tipo de Operação
          </CardTitle>
          <CardDescription>Limites de tokens para cada tipo de chamada IA</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {([
            { key: "max_tokens_default" as const, label: "Respostas Padrão" },
            { key: "max_tokens_analysis" as const, label: "Análises" },
            { key: "max_tokens_generation" as const, label: "Geração de Conteúdo" },
            { key: "max_tokens_agents" as const, label: "Agentes" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              <Input
                type="number"
                min={256}
                step={256}
                value={form[key] ?? 2048}
                onChange={(e) => update(key, Number(e.target.value))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Definições
        </Button>
      </div>
    </div>
  );
}
