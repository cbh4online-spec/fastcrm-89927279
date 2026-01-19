import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Settings2, Users, FileText, Briefcase, Euro } from "lucide-react";
import { useCurrentMonthGoal, useUpsertSalesGoal } from "@/hooks/useSalesGoals";
import { useLeads } from "@/hooks/useLeads";
import { useProposals } from "@/hooks/useProposals";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface SalesGoalsWidgetProps {
  isLoading?: boolean;
}

export function SalesGoalsWidget({ isLoading = false }: SalesGoalsWidgetProps) {
  const { data: goal, isLoading: goalLoading } = useCurrentMonthGoal();
  const { data: leads } = useLeads();
  const { data: proposals } = useProposals();
  const { data: opportunities } = useOpportunities();
  const { data: paidInvoices } = useInvoices({ status: "paid" });
  const upsertGoal = useUpsertSalesGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [leadsTarget, setLeadsTarget] = useState("");
  const [proposalsTarget, setProposalsTarget] = useState("");
  const [opportunitiesTarget, setOpportunitiesTarget] = useState("");
  const [revenueTarget, setRevenueTarget] = useState("");

  const currentMonth = useMemo(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: format(now, "MMMM yyyy", { locale: pt }),
    };
  }, []);

  const currentMetrics = useMemo(() => {
    const monthStart = currentMonth.start;
    const monthEnd = currentMonth.end;

    const monthLeads = (leads || []).filter(l =>
      isWithinInterval(new Date(l.created_at), { start: monthStart, end: monthEnd })
    ).length;

    const monthProposals = (proposals || []).filter(p =>
      isWithinInterval(new Date(p.created_at), { start: monthStart, end: monthEnd })
    ).length;

    const monthOpportunities = (opportunities || []).filter(o =>
      o.status === "won" && o.updated_at &&
      isWithinInterval(new Date(o.updated_at), { start: monthStart, end: monthEnd })
    ).length;

    const monthRevenue = (paidInvoices || [])
      .filter(inv => inv.paid_at &&
        isWithinInterval(new Date(inv.paid_at), { start: monthStart, end: monthEnd })
      )
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return {
      leads: monthLeads,
      proposals: monthProposals,
      opportunities: monthOpportunities,
      revenue: monthRevenue,
    };
  }, [leads, proposals, opportunities, paidInvoices, currentMonth]);

  const handleSaveGoals = async () => {
    try {
      await upsertGoal.mutateAsync({
        month: new Date(),
        leads_target: parseInt(leadsTarget) || 0,
        proposals_target: parseInt(proposalsTarget) || 0,
        opportunities_target: parseInt(opportunitiesTarget) || 0,
        revenue_target: parseFloat(revenueTarget) || 0,
      });
      toast.success("Metas atualizadas com sucesso!");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao guardar metas");
    }
  };

  const openDialog = () => {
    if (goal) {
      setLeadsTarget(String(goal.leads_target));
      setProposalsTarget(String(goal.proposals_target));
      setOpportunitiesTarget(String(goal.opportunities_target));
      setRevenueTarget(String(goal.revenue_target));
    }
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value.toFixed(0)}`;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 75) return "bg-amber-500";
    if (percent >= 50) return "bg-blue-500";
    return "bg-muted-foreground";
  };

  const metrics = [
    {
      label: "Leads",
      icon: Users,
      current: currentMetrics.leads,
      target: goal?.leads_target || 0,
      color: "text-blue-500",
    },
    {
      label: "Propostas",
      icon: FileText,
      current: currentMetrics.proposals,
      target: goal?.proposals_target || 0,
      color: "text-amber-500",
    },
    {
      label: "Oportunidades",
      icon: Briefcase,
      current: currentMetrics.opportunities,
      target: goal?.opportunities_target || 0,
      color: "text-purple-500",
    },
    {
      label: "Receita",
      icon: Euro,
      current: currentMetrics.revenue,
      target: goal?.revenue_target || 0,
      color: "text-emerald-500",
      isCurrency: true,
    },
  ];

  const loading = isLoading || goalLoading;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!goal) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Metas de {currentMonth.label}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Sem metas definidas para este mês</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openDialog}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Definir Metas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Definir Metas para {currentMonth.label}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Meta de Leads</Label>
                    <Input
                      type="number"
                      value={leadsTarget}
                      onChange={(e) => setLeadsTarget(e.target.value)}
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta de Propostas</Label>
                    <Input
                      type="number"
                      value={proposalsTarget}
                      onChange={(e) => setProposalsTarget(e.target.value)}
                      placeholder="Ex: 20"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta de Oportunidades Fechadas</Label>
                    <Input
                      type="number"
                      value={opportunitiesTarget}
                      onChange={(e) => setOpportunitiesTarget(e.target.value)}
                      placeholder="Ex: 10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta de Receita (€)</Label>
                    <Input
                      type="number"
                      value={revenueTarget}
                      onChange={(e) => setRevenueTarget(e.target.value)}
                      placeholder="Ex: 50000"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveGoals} disabled={upsertGoal.isPending}>
                  Guardar Metas
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Metas de {currentMonth.label}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openDialog}>
                <Settings2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Metas para {currentMonth.label}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Meta de Leads</Label>
                  <Input
                    type="number"
                    value={leadsTarget}
                    onChange={(e) => setLeadsTarget(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Meta de Propostas</Label>
                  <Input
                    type="number"
                    value={proposalsTarget}
                    onChange={(e) => setProposalsTarget(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Meta de Oportunidades Fechadas</Label>
                  <Input
                    type="number"
                    value={opportunitiesTarget}
                    onChange={(e) => setOpportunitiesTarget(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Meta de Receita (€)</Label>
                  <Input
                    type="number"
                    value={revenueTarget}
                    onChange={(e) => setRevenueTarget(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveGoals} disabled={upsertGoal.isPending}>
                Guardar Metas
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {metrics.map((metric) => {
            const percent = metric.target > 0 
              ? Math.min(Math.round((metric.current / metric.target) * 100), 100)
              : 0;
            const Icon = metric.icon;

            return (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {metric.isCurrency
                      ? `${formatCurrency(metric.current)} / ${formatCurrency(metric.target)}`
                      : `${metric.current} / ${metric.target}`
                    }
                  </span>
                </div>
                <div className="relative">
                  <Progress value={percent} className="h-2" />
                  <div 
                    className={`absolute inset-0 h-2 rounded-full ${getProgressColor(percent)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{percent}%</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
