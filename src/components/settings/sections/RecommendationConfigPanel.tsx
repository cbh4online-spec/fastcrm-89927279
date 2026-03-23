import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Save, RotateCcw } from "lucide-react";

interface RecConfig {
  id?: string;
  workspace_id: string;
  weight_history: number;
  weight_profile: number;
  weight_collaborative: number;
  weight_semantic: number;
  min_score_threshold: number;
  max_recommendations: number;
  enabled: boolean;
}

const DEFAULTS: Omit<RecConfig, "workspace_id" | "id"> = {
  weight_history: 0.40,
  weight_profile: 0.25,
  weight_collaborative: 0.20,
  weight_semantic: 0.15,
  min_score_threshold: 20,
  max_recommendations: 10,
  enabled: true,
};

export function RecommendationConfigPanel() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["recommendation-config", workspaceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("recommendation_config")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      return data as RecConfig | null;
    },
    enabled: !!workspaceId,
  });

  const [form, setForm] = useState<Omit<RecConfig, "workspace_id" | "id">>(DEFAULTS);

  useEffect(() => {
    if (config) {
      setForm({
        weight_history: Number(config.weight_history) || DEFAULTS.weight_history,
        weight_profile: Number(config.weight_profile) || DEFAULTS.weight_profile,
        weight_collaborative: Number(config.weight_collaborative) || DEFAULTS.weight_collaborative,
        weight_semantic: Number(config.weight_semantic) || DEFAULTS.weight_semantic,
        min_score_threshold: Number(config.min_score_threshold) || DEFAULTS.min_score_threshold,
        max_recommendations: config.max_recommendations || DEFAULTS.max_recommendations,
        enabled: config.enabled ?? true,
      });
    }
  }, [config]);

  const totalWeight = form.weight_history + form.weight_profile + form.weight_collaborative + form.weight_semantic;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workspace_id: workspaceId!,
        ...form,
        updated_at: new Date().toISOString(),
      };
      if (config?.id) {
        await (supabase as any)
          .from("recommendation_config")
          .update(payload)
          .eq("id", config.id);
      } else {
        await (supabase as any)
          .from("recommendation_config")
          .insert(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendation-config", workspaceId] });
      toast.success("Configuração de recomendações guardada");
    },
    onError: () => toast.error("Erro ao guardar configuração"),
  });

  const setWeight = (key: keyof typeof form, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">A carregar...</div>;
  }

  const weightSlider = (label: string, description: string, key: "weight_history" | "weight_profile" | "weight_collaborative" | "weight_semantic", color: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={`text-sm font-bold ${color}`}>
          {Math.round(form[key] * 100)}%
        </span>
      </div>
      <Slider
        value={[form[key] * 100]}
        onValueChange={([v]) => setWeight(key, v / 100)}
        min={0}
        max={100}
        step={5}
        className="w-full"
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Recomendações de Produtos</CardTitle>
              <CardDescription>
                Ajuste os pesos das estratégias de recomendação e os limites de sugestão
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm(prev => ({ ...prev, enabled: v }))}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weights */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Pesos das Estratégias</h4>
          {weightSlider("Histórico de Compras", "Baseado em compras anteriores e ciclos de recompra", "weight_history", "text-blue-600")}
          {weightSlider("Perfil da Entidade", "Baseado no sector, contexto e lead score", "weight_profile", "text-emerald-600")}
          {weightSlider("Filtragem Colaborativa", "Baseado em co-ocorrência de produtos entre clientes", "weight_collaborative", "text-amber-600")}
          {weightSlider("Análise Semântica (IA)", "Razões contextuais geradas por IA", "weight_semantic", "text-purple-600")}

          <div className={`text-xs font-medium px-3 py-2 rounded-md ${
            Math.abs(totalWeight - 1) < 0.01
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-destructive/10 text-destructive"
          }`}>
            Total: {Math.round(totalWeight * 100)}%
            {Math.abs(totalWeight - 1) >= 0.01 && " — os pesos devem somar 100%"}
          </div>
        </div>

        {/* Thresholds */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Score mínimo</Label>
            <p className="text-xs text-muted-foreground">Recomendações abaixo deste valor são descartadas</p>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.min_score_threshold}
              onChange={(e) => setForm(prev => ({ ...prev, min_score_threshold: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Máximo de sugestões</Label>
            <p className="text-xs text-muted-foreground">Número máximo de recomendações por entidade</p>
            <Input
              type="number"
              min={1}
              max={25}
              value={form.max_recommendations}
              onChange={(e) => setForm(prev => ({ ...prev, max_recommendations: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || Math.abs(totalWeight - 1) >= 0.01}
            size="sm"
          >
            <Save className="h-4 w-4 mr-1" />
            Guardar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm(DEFAULTS)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Repor Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
