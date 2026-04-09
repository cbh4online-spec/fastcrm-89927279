import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Loader2, TrendingUp, TrendingDown, Zap, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRunScenario,
  useRevenueScenarios,
  useRevenueFlightSnapshot,
  formatCurrency,
} from "@/hooks/useRevenueFlightControl";

function RFCScenariosPage() {
  const navigate = useNavigate();
  const runScenario = useRunScenario();
  const { data: scenarios } = useRevenueScenarios();
  const { data: snapshots } = useRevenueFlightSnapshot();
  const latest = snapshots?.[0];

  const [additionalDeals, setAdditionalDeals] = useState(0);
  const [conversionImprovement, setConversionImprovement] = useState(0);
  const [reactivatedDeals, setReactivatedDeals] = useState(0);
  const [newMeetings, setNewMeetings] = useState(0);
  const [slippedValue, setSlippedValue] = useState(0);
  const [scenarioName, setScenarioName] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleRunScenario = async () => {
    const res = await runScenario.mutateAsync({
      scenario_name: scenarioName || "Cenário personalizado",
      scenario_type: "custom",
      input_json: {
        additional_deals_closed: additionalDeals,
        conversion_rate_improvement: conversionImprovement,
        reactivated_deals: reactivatedDeals,
        new_meetings_booked: newMeetings,
        deal_slipped_value: slippedValue,
      },
    });
    setResult(res?.data?.output);
  };

  const presets = [
    { label: "+1 Deal Fecha", action: () => { setAdditionalDeals(1); setConversionImprovement(0); setReactivatedDeals(0); setNewMeetings(0); setSlippedValue(0); setScenarioName("+1 Deal Fecha"); } },
    { label: "+10% Conversão", action: () => { setAdditionalDeals(0); setConversionImprovement(10); setReactivatedDeals(0); setNewMeetings(0); setSlippedValue(0); setScenarioName("+10% Conversão"); } },
    { label: "3 Reativados", action: () => { setAdditionalDeals(0); setConversionImprovement(0); setReactivatedDeals(3); setNewMeetings(0); setSlippedValue(0); setScenarioName("3 Deals Reativados"); } },
    { label: "Deal Escapa", action: () => { setAdditionalDeals(0); setConversionImprovement(0); setReactivatedDeals(0); setNewMeetings(0); setSlippedValue(10000); setScenarioName("Deal Alto Valor Escapa"); } },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate("/dashboard/revenue-flight-control")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold">Scenario Planner</h1>
            <p className="text-[10px] sm:text-sm text-muted-foreground">Simula cenários what-if</p>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {presets.map((p) => (
            <Button key={p.label} variant="outline" size="sm" onClick={p.action} className="shrink-0 h-8 text-xs">
              <Zap className="h-3 w-3 mr-1" /> {p.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Input */}
          <Card>
            <CardHeader className="px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm">Parâmetros do Cenário</CardTitle></CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
              <div>
                <Label className="text-xs">Nome do cenário</Label>
                <Input value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="Ex: Best case Q1" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Deals adicionais que fecham: {additionalDeals}</Label>
                <Slider value={[additionalDeals]} onValueChange={v => setAdditionalDeals(v[0])} min={0} max={10} step={1} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Melhoria conversão: {conversionImprovement}%</Label>
                <Slider value={[conversionImprovement]} onValueChange={v => setConversionImprovement(v[0])} min={0} max={50} step={5} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Deals reativados: {reactivatedDeals}</Label>
                <Slider value={[reactivatedDeals]} onValueChange={v => setReactivatedDeals(v[0])} min={0} max={10} step={1} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Novas reuniões: {newMeetings}</Label>
                <Slider value={[newMeetings]} onValueChange={v => setNewMeetings(v[0])} min={0} max={20} step={1} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Deal que escapa: €{slippedValue.toLocaleString()}</Label>
                <Slider value={[slippedValue]} onValueChange={v => setSlippedValue(v[0])} min={0} max={50000} step={1000} className="mt-2" />
              </div>

              <Button className="w-full h-10" onClick={handleRunScenario} disabled={runScenario.isPending}>
                {runScenario.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Simular Cenário
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          <div className="space-y-4">
            {result ? (
              <Card className="border-primary/20">
                <CardHeader className="px-3 sm:px-6"><CardTitle className="text-xs sm:text-sm">Resultado da Simulação</CardTitle></CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Likely Original</p>
                      <p className="text-sm sm:text-lg font-bold">{formatCurrency(result.original_most_likely)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Likely Ajustado</p>
                      <p className="text-sm sm:text-lg font-bold text-primary">{formatCurrency(result.adjusted_most_likely)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Gap Original</p>
                      <p className={cn("text-sm sm:text-lg font-bold", result.original_gap > 0 ? "text-red-400" : "text-emerald-400")}>{formatCurrency(Math.abs(result.original_gap))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Gap Ajustado</p>
                      <p className={cn("text-sm sm:text-lg font-bold", result.adjusted_gap > 0 ? "text-red-400" : "text-emerald-400")}>{formatCurrency(Math.abs(result.adjusted_gap))}</p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      {result.delta >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" /> : <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />}
                      <span className={cn("text-lg sm:text-xl font-bold", result.delta >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {result.delta >= 0 ? "+" : ""}{formatCurrency(result.delta)}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Hit: {Math.round(result.original_hit_probability * 100)}% → {Math.round(result.adjusted_hit_probability * 100)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 sm:py-16 text-center">
                  <Play className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Configura os parâmetros e clica simular</p>
                </CardContent>
              </Card>
            )}

            {/* Scenario History */}
            {(scenarios || []).length > 0 && (
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm flex items-center gap-2"><History className="h-4 w-4" /> Cenários Guardados</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(scenarios || []).map((s: any) => {
                      const output = s.output_json || {};
                      return (
                        <div key={s.id} className="p-2.5 sm:p-3 rounded-lg bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs sm:text-sm font-medium truncate">{s.scenario_name}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">{s.scenario_type}</Badge>
                          </div>
                          {output.delta != null && (
                            <p className={cn("text-xs mt-1", output.delta >= 0 ? "text-emerald-400" : "text-red-400")}>
                              Delta: {output.delta >= 0 ? "+" : ""}{formatCurrency(output.delta)}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-PT")}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RFCScenariosPage;
