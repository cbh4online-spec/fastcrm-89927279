import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Eye, Save, RotateCcw } from "lucide-react";

interface HealthConfig {
  label_thresholds: { healthy: number; watch: number };
  value_sensitivity_threshold: number;
  value_sensitivity_multiplier: number;
}

const DEFAULT_CONFIG: HealthConfig = {
  label_thresholds: { healthy: 80, watch: 50 },
  value_sensitivity_threshold: 50000,
  value_sensitivity_multiplier: 1.2,
};

export function HealthEngineSettings() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  const [config, setConfig] = useState<HealthConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);

  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["health-engine-config", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data, error } = await workspaceClient
        .from("health_engine_config")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        label_thresholds: (savedConfig.label_thresholds as any) || DEFAULT_CONFIG.label_thresholds,
        value_sensitivity_threshold: Number(savedConfig.value_sensitivity_threshold) || DEFAULT_CONFIG.value_sensitivity_threshold,
        value_sensitivity_multiplier: Number(savedConfig.value_sensitivity_multiplier) || DEFAULT_CONFIG.value_sensitivity_multiplier,
      });
    } else {
      setConfig(DEFAULT_CONFIG);
    }
    setIsDirty(false);
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async (cfg: HealthConfig) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { error } = await workspaceClient
        .from("health_engine_config")
        .upsert({
          workspace_id: currentWorkspace.id,
          label_thresholds: cfg.label_thresholds as any,
          value_sensitivity_threshold: cfg.value_sensitivity_threshold,
          value_sensitivity_multiplier: cfg.value_sensitivity_multiplier,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-engine-config"] });
      toast.success("Configuração guardada");
      setIsDirty(false);
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const updateConfig = (partial: Partial<HealthConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setIsDirty(true);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Label Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Limiares de Classificação</CardTitle>
          <CardDescription className="text-xs">
            Defina os limites para os estados de saúde dos negócios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <Label className="text-sm">Healthy ≥</Label>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {config.label_thresholds.healthy}
              </Badge>
            </div>
            <Slider
              value={[config.label_thresholds.healthy]}
              onValueChange={([v]) =>
                updateConfig({
                  label_thresholds: {
                    ...config.label_thresholds,
                    healthy: Math.max(v, config.label_thresholds.watch + 1),
                  },
                })
              }
              min={50}
              max={100}
              step={5}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-600" />
                <Label className="text-sm">Watch ≥</Label>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {config.label_thresholds.watch}
              </Badge>
            </div>
            <Slider
              value={[config.label_thresholds.watch]}
              onValueChange={([v]) =>
                updateConfig({
                  label_thresholds: {
                    ...config.label_thresholds,
                    watch: Math.min(v, config.label_thresholds.healthy - 1),
                  },
                })
              }
              min={20}
              max={80}
              step={5}
            />
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>At Risk: abaixo de {config.label_thresholds.watch}</span>
          </div>
        </CardContent>
      </Card>

      {/* Value Sensitivity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Sensibilidade por Valor</CardTitle>
          <CardDescription className="text-xs">
            Deals acima deste valor recebem penalizações amplificadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Limiar de Valor (€)</Label>
              <Input
                type="number"
                value={config.value_sensitivity_threshold}
                onChange={(e) =>
                  updateConfig({ value_sensitivity_threshold: Number(e.target.value) || 0 })
                }
                min={0}
                step={1000}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Multiplicador</Label>
              <Input
                type="number"
                value={config.value_sensitivity_multiplier}
                onChange={(e) =>
                  updateConfig({ value_sensitivity_multiplier: Number(e.target.value) || 1 })
                }
                min={1}
                max={3}
                step={0.1}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ex: Deals acima de €{config.value_sensitivity_threshold.toLocaleString()} terão penalizações 
            multiplicadas por {config.value_sensitivity_multiplier}×
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConfig(DEFAULT_CONFIG);
            setIsDirty(true);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Repor
        </Button>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate(config)}
          disabled={!isDirty || saveMutation.isPending}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saveMutation.isPending ? "A guardar..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
