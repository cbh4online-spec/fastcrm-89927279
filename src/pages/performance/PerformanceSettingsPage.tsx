import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DEFAULT_KPI_WEIGHTS } from "@/hooks/usePerformanceScores";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceSettingsPage() {
  const [weights, setWeights] = useState(DEFAULT_KPI_WEIGHTS);
  const [tvCycleSeconds, setTvCycleSeconds] = useState(20);
  const [autoRecognition, setAutoRecognition] = useState(true);

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  const handleSave = () => {
    if (Math.abs(totalWeight - 1) > 0.01) {
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
        <PageHeader title="Configurações de Performance" description="Pesos dos KPIs, reconhecimento e TV Mode" />

        {/* KPI Weights */}
        <Card>
          <CardHeader>
            <CardTitle>Pesos dos KPIs</CardTitle>
            <CardDescription>
              Define a importância relativa de cada métrica no score final.
              Total: <span className={Math.abs(totalWeight - 1) > 0.01 ? "text-destructive font-bold" : "text-green-600 font-bold"}>
                {Math.round(totalWeight * 100)}%
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{weightLabels[key] || key}</Label>
                  <span className="text-sm font-mono font-bold">{Math.round(value * 100)}%</span>
                </div>
                <Slider
                  value={[value * 100]}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setWeights(w => ({ ...w, [key]: v / 100 }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recognition Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Reconhecimento Automático</CardTitle>
            <CardDescription>Atribuição automática baseada em performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Reconhecimento automático</Label>
                <p className="text-xs text-muted-foreground">Atribui prémios automaticamente no final de cada período</p>
              </div>
              <Switch checked={autoRecognition} onCheckedChange={setAutoRecognition} />
            </div>
          </CardContent>
        </Card>

        {/* TV Mode Settings */}
        <Card>
          <CardHeader>
            <CardTitle>TV Mode</CardTitle>
            <CardDescription>Configurações de exibição em ecrã grande</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tempo por slide (segundos)</Label>
              <Input
                type="number"
                value={tvCycleSeconds}
                onChange={e => setTvCycleSeconds(Number(e.target.value))}
                min={5}
                max={120}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" /> Guardar Configurações
        </Button>
      </div>
    </DashboardLayout>
  );
}
