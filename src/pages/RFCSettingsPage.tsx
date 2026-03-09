import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useRevenueModelConfig,
  useSaveModelConfig,
  useRevenueTarget,
  useSaveRevenueTarget,
} from "@/hooks/useRevenueFlightControl";

function RFCSettingsPage() {
  const navigate = useNavigate();
  const { data: config } = useRevenueModelConfig();
  const { data: target } = useRevenueTarget();
  const saveConfig = useSaveModelConfig();
  const saveTarget = useSaveRevenueTarget();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [targetRevenue, setTargetRevenue] = useState(target?.target_revenue || 0);
  const [targetDeals, setTargetDeals] = useState(target?.target_deals || 0);
  const [stalledDays, setStalledDays] = useState(config?.stalled_threshold_days || 7);
  const [hotDealThreshold, setHotDealThreshold] = useState(config?.hot_deal_threshold || 75);
  const [avgSalesCycle, setAvgSalesCycle] = useState(config?.avg_sales_cycle_days || 30);
  const [proposalToClose, setProposalToClose] = useState(config?.proposal_to_close_rate || 0.3);
  const [meetingToProposal, setMeetingToProposal] = useState(config?.meeting_to_proposal_rate || 0.5);

  const handleSaveTarget = async () => {
    await saveTarget.mutateAsync({
      target_revenue: targetRevenue,
      target_deals: targetDeals,
      period_start: monthStart,
      period_end: monthEnd,
    });
    toast.success("Target mensal guardado");
  };

  const handleSaveConfig = async () => {
    await saveConfig.mutateAsync({
      stalled_threshold_days: stalledDays,
      hot_deal_threshold: hotDealThreshold,
      avg_sales_cycle_days: avgSalesCycle,
      proposal_to_close_rate: proposalToClose,
      meeting_to_proposal_rate: meetingToProposal,
    });
    toast.success("Configuração do modelo guardada");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-[900px] mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/revenue-flight-control")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Targets e parâmetros do modelo de previsão</p>
          </div>
        </div>

        {/* Revenue Target */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Target Mensal ({now.toLocaleString("pt-PT", { month: "long", year: "numeric" })})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receita target (€)</Label>
                <Input type="number" value={targetRevenue} onChange={e => setTargetRevenue(Number(e.target.value))} />
              </div>
              <div>
                <Label>Negócios target</Label>
                <Input type="number" value={targetDeals} onChange={e => setTargetDeals(Number(e.target.value))} />
              </div>
            </div>
            <Button onClick={handleSaveTarget} disabled={saveTarget.isPending}>
              {saveTarget.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Target
            </Button>
          </CardContent>
        </Card>

        {/* Model Config */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Modelo de Previsão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dias para considerar estagnado</Label>
                <Input type="number" value={stalledDays} onChange={e => setStalledDays(Number(e.target.value))} />
              </div>
              <div>
                <Label>Threshold deal HOT (%)</Label>
                <Input type="number" value={hotDealThreshold} onChange={e => setHotDealThreshold(Number(e.target.value))} />
              </div>
              <div>
                <Label>Ciclo de vendas médio (dias)</Label>
                <Input type="number" value={avgSalesCycle} onChange={e => setAvgSalesCycle(Number(e.target.value))} />
              </div>
              <div>
                <Label>Taxa proposta → fecho</Label>
                <Input type="number" step="0.05" value={proposalToClose} onChange={e => setProposalToClose(Number(e.target.value))} />
              </div>
              <div>
                <Label>Taxa reunião → proposta</Label>
                <Input type="number" step="0.05" value={meetingToProposal} onChange={e => setMeetingToProposal(Number(e.target.value))} />
              </div>
            </div>
            <Button onClick={handleSaveConfig} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Configuração
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default RFCSettingsPage;
