import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAISettings, useUpdateAISettings } from "@/hooks/useAISettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatTokenCount } from "@/types/ai-settings";
import {
  Cpu, Thermometer, ToggleLeft, BarChart3, Save, ArrowLeft,
  Sparkles, Brain, Bot, MessageSquare, Target, TrendingUp, Lightbulb,
} from "lucide-react";

const AVAILABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rápido, económico)", cost: "~$0.15/1M input" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (equilibrado)", cost: "~$0.15/1M input" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (máxima qualidade)", cost: "~$1.25/1M input" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (equilibrado)", cost: "~$0.40/1M input" },
  { value: "openai/gpt-5", label: "GPT-5 (máxima qualidade)", cost: "~$2.50/1M input" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (Anthropic)", cost: "~$3.00/1M input" },
];

const FEATURE_TOGGLES = [
  { key: "ai_copilot_enabled", label: "AI Copilot", description: "Classificação, sugestões, resumos na inbox", icon: Brain },
  { key: "ai_inbox_reply_enabled", label: "Respostas Inbox", description: "Sugestões de resposta e personalização", icon: MessageSquare },
  { key: "ai_suggestions_enabled", label: "AI Sugestões", description: "Auto-tags, sugestões de campos e automações", icon: Lightbulb },
  { key: "ai_employees_enabled", label: "AI Employees", description: "Executores autónomos de tarefas", icon: Bot },
  { key: "ai_agents_enabled", label: "AI Agents", description: "Operadores SDR, Rescue, Upsell, Scorer", icon: Target },
  { key: "ai_sales_coach_enabled", label: "Sales Coach", description: "Deal intelligence, opportunity coaching", icon: TrendingUp },
  { key: "ai_imo_enabled", label: "IMO AI", description: "Inteligência de mercado e oportunidades", icon: Sparkles },
] as const;

export default function AISettingsPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useAISettings();
  const updateSettings = useUpdateAISettings();

  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});
  const isDirty = Object.keys(localSettings).length > 0;

  const getValue = (key: string) => {
    if (key in localSettings) return localSettings[key];
    return (settings as any)?.[key];
  };

  const setValue = (key: string, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localSettings as any);
      setLocalSettings({});
      toast.success("Configurações de IA guardadas");
    } catch {
      toast.error("Erro ao guardar configurações");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">A carregar configurações...</div>
        </div>
      </DashboardLayout>
    );
  }

  const budgetUsed = Number(getValue("current_month_tokens") ?? 0);
  const budgetTotal = Number(getValue("monthly_token_budget") ?? 0);
  const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : 0;
  const monthCost = Number(getValue("current_month_cost_usd") ?? 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings/automation")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Cpu className="h-6 w-6 text-primary" />
                Configurações de IA
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Modelo, limites de tokens, temperaturas e funcionalidades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/ai-usage")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Utilização
            </Button>
            {isDirty && (
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            )}
          </div>
        </div>

        {/* Usage Summary Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tokens este mês</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatTokenCount(budgetUsed)}</p>
                {budgetTotal > 0 && (
                  <div className="mt-2">
                    <Progress value={budgetPct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{budgetPct}% de {formatTokenCount(budgetTotal)}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Custo estimado</p>
                <p className="text-2xl font-bold text-foreground mt-1">~${monthCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">USD este mês</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Reset</p>
                <p className="text-sm text-foreground mt-1">Dia 1 de cada mês</p>
                <p className="text-xs text-muted-foreground mt-1">Automático</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model & Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Modelo e Limites
            </CardTitle>
            <CardDescription>Modelo padrão e limites de tokens por tipo de tarefa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Modelo padrão</Label>
              <Select
                value={getValue("default_model") as string ?? "google/gemini-3-flash-preview"}
                onValueChange={(v) => setValue("default_model", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{m.label}</span>
                        <Badge variant="outline" className="text-xs">{m.cost}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "max_tokens_default", label: "Padrão", desc: "Tarefas gerais" },
                { key: "max_tokens_analysis", label: "Análise", desc: "Classificação, scoring" },
                { key: "max_tokens_generation", label: "Geração", desc: "Conteúdo, propostas" },
                { key: "max_tokens_agents", label: "Agents", desc: "AI Employees/Agents" },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <Label className="text-sm">{item.label}</Label>
                  <Input
                    type="number"
                    value={getValue(item.key) as number ?? 1024}
                    onChange={(e) => setValue(item.key, parseInt(e.target.value) || 1024)}
                    min={256}
                    max={16384}
                    step={256}
                  />
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Orçamento mensal de tokens</Label>
              <Input
                type="number"
                value={getValue("monthly_token_budget") as number ?? 0}
                onChange={(e) => setValue("monthly_token_budget", parseInt(e.target.value) || 0)}
                min={0}
                step={100000}
                placeholder="0 = ilimitado"
              />
              <p className="text-xs text-muted-foreground">0 = sem limite. Quando atingido, chamadas de IA serão bloqueadas.</p>
            </div>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Temperatura por Caso de Uso
            </CardTitle>
            <CardDescription>Controla a criatividade vs precisão das respostas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { key: "temperature_creative", label: "Criativo", desc: "Copy, templates, propostas", default_val: 0.7 },
              { key: "temperature_analytical", label: "Analítico", desc: "Classificação, scoring, análise", default_val: 0.2 },
              { key: "temperature_balanced", label: "Equilibrado", desc: "Assistente geral, copilot", default_val: 0.4 },
            ].map((item) => {
              const val = (getValue(item.key) as number) ?? item.default_val;
              return (
                <div key={item.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Badge variant="outline">{val.toFixed(2)}</Badge>
                  </div>
                  <Slider
                    value={[val]}
                    onValueChange={([v]) => setValue(item.key, v)}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Funcionalidades de IA
            </CardTitle>
            <CardDescription>Activa ou desactiva módulos de IA individualmente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {FEATURE_TOGGLES.map((feat) => {
              const enabled = (getValue(feat.key) as boolean) ?? true;
              const Icon = feat.icon;
              return (
                <div
                  key={feat.key}
                  className="flex items-center justify-between py-3 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{feat.label}</p>
                      <p className="text-xs text-muted-foreground">{feat.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => setValue(feat.key, v)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Idioma das respostas IA</Label>
                <p className="text-xs text-muted-foreground mt-1">Todas as respostas de IA serão neste idioma</p>
              </div>
              <Select
                value={getValue("response_language") as string ?? "pt-PT"}
                onValueChange={(v) => setValue("response_language", v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-PT">Português (PT)</SelectItem>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save button at bottom */}
        {isDirty && (
          <div className="flex justify-end pb-8">
            <Button onClick={handleSave} disabled={updateSettings.isPending} size="lg">
              <Save className="h-4 w-4 mr-2" />
              Guardar Alterações
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
