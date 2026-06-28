import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DEFAULT_KPI_WEIGHTS } from "@/hooks/usePerformanceScores";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PerformanceSettingsPage() {
  const [weights, setWeights] = useState(DEFAULT_KPI_WEIGHTS);
  const [tvCycleSeconds, setTvCycleSeconds] = useState(20);
  const [autoRecognition, setAutoRecognition] = useState(true);

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const totalOk = Math.abs(totalWeight - 1) <= 0.01;

  const handleSave = () => {
    if (!totalOk) {
      toast.error("Os pesos devem somar 100%");
      return;
    }
    toast.success("Configurações guardadas");
  };

  const weightLabels: Record<string, string> = {
    revenue_generated: "Receita Fechada",
    pipeline_generated: "Pipeline Gerado",
    meetings_booked: "Reuniões",
    proposals_sent: "Propostas Enviadas",
    leads_generated: "Leads Gerados",
    followups_completed: "Follow-ups",
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header IX */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações de Performance</h1>
            <p className="text-sm text-muted-foreground mt-1">Pesos dos KPIs, reconhecimento e TV Mode</p>
          </div>
          <Button onClick={handleSave} className="rounded-full">
            <Save className="h-4 w-4 mr-2" /> Guardar
          </Button>
        </div>

        {/* KPI Weights */}
        <IXCard
          title="Pesos dos KPIs"
          actions={
            <span className={cn("text-sm font-semibold", totalOk ? "text-foreground" : "text-destructive")}>
              Total: {Math.round(totalWeight * 100)}%
            </span>
          }
        >
          <p className="text-sm text-muted-foreground -mt-2 mb-4">
            Define a importância relativa de cada métrica no score final.
          </p>
          <div className="space-y-5">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{weightLabels[key] || key}</Label>
                  <span className="text-sm font-mono font-semibold tabular-nums">{Math.round(value * 100)}%</span>
                </div>
                <Slider
                  value={[value * 100]}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setWeights(w => ({ ...w, [key]: v / 100 }))}
                />
              </div>
            ))}
          </div>
        </IXCard>

        {/* Recognition Settings */}
        <IXCard title="Reconhecimento Automático">
          <p className="text-sm text-muted-foreground -mt-2 mb-4">
            Atribuição automática baseada em performance.
          </p>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Reconhecimento automático</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Atribui prémios automaticamente no final de cada período
              </p>
            </div>
            <Switch checked={autoRecognition} onCheckedChange={setAutoRecognition} />
          </div>
        </IXCard>

        {/* TV Mode Settings */}
        <IXCard title="TV Mode">
          <p className="text-sm text-muted-foreground -mt-2 mb-4">
            Configurações de exibição em ecrã grande.
          </p>
          <div>
            <Label className="text-sm">Tempo por slide (segundos)</Label>
            <Input
              type="number"
              value={tvCycleSeconds}
              onChange={e => setTvCycleSeconds(Number(e.target.value))}
              min={5}
              max={120}
              className="mt-1.5 max-w-[160px]"
            />
          </div>
        </IXCard>
      </div>
    </DashboardLayout>
  );
}
