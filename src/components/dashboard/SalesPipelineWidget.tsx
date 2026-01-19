import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/hooks/useLeads";
import { useProposals } from "@/hooks/useProposals";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo } from "react";
import { Users, FileText, Briefcase, CheckCircle, ArrowRight, TrendingUp } from "lucide-react";

interface SalesPipelineWidgetProps {
  isLoading?: boolean;
}

export function SalesPipelineWidget({ isLoading = false }: SalesPipelineWidgetProps) {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { data: paidInvoices, isLoading: invoicesLoading } = useInvoices({ status: "paid" });

  const pipelineData = useMemo(() => {
    const allLeads = leads || [];
    const allProposals = proposals || [];
    const allOpportunities = opportunities || [];
    const paid = paidInvoices || [];

    // Active leads (new or in_progress)
    const activeLeads = allLeads.filter(l => l.status === "new" || l.status === "in_progress");
    
    // Active proposals (draft or published)
    const activeProposals = allProposals.filter(p => p.status === "draft" || p.status === "published");
    
    // Open opportunities
    const openOpportunities = allOpportunities.filter(o => o.status === "open");
    
    // Won opportunities + Paid invoices (closed deals)
    const wonOpportunities = allOpportunities.filter(o => o.status === "won");

    // Calculate values - use price for proposals, value for opportunities
    const proposalsValue = activeProposals.reduce((sum, p) => sum + (p.price || 0), 0);
    const opportunitiesValue = openOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);
    const closedValue = wonOpportunities.reduce((sum, o) => sum + (o.value || 0), 0) +
                        paid.reduce((sum, inv) => sum + (inv.total || 0), 0);

    return [
      {
        stage: "Leads",
        icon: Users,
        count: activeLeads.length,
        value: 0, // Leads don't have value in this schema
        color: "bg-blue-500",
        textColor: "text-blue-500",
        bgLight: "bg-blue-500/10",
      },
      {
        stage: "Propostas",
        icon: FileText,
        count: activeProposals.length,
        value: proposalsValue,
        color: "bg-amber-500",
        textColor: "text-amber-500",
        bgLight: "bg-amber-500/10",
      },
      {
        stage: "Oportunidades",
        icon: Briefcase,
        count: openOpportunities.length,
        value: opportunitiesValue,
        color: "bg-purple-500",
        textColor: "text-purple-500",
        bgLight: "bg-purple-500/10",
      },
      {
        stage: "Fechados",
        icon: CheckCircle,
        count: wonOpportunities.length + paid.length,
        value: closedValue,
        color: "bg-emerald-500",
        textColor: "text-emerald-500",
        bgLight: "bg-emerald-500/10",
      },
    ];
  }, [leads, proposals, opportunities, paidInvoices]);

  const conversionRates = useMemo(() => {
    if (pipelineData[0].count === 0) return { leadsToProposals: 0, proposalsToOpps: 0, oppsToClose: 0 };
    
    const leadsToProposals = pipelineData[1].count > 0 && pipelineData[0].count > 0
      ? Math.round((pipelineData[1].count / pipelineData[0].count) * 100)
      : 0;
    const proposalsToOpps = pipelineData[2].count > 0 && pipelineData[1].count > 0
      ? Math.round((pipelineData[2].count / pipelineData[1].count) * 100)
      : 0;
    const oppsToClose = pipelineData[3].count > 0 && pipelineData[2].count > 0
      ? Math.round((pipelineData[3].count / pipelineData[2].count) * 100)
      : 0;

    return { leadsToProposals, proposalsToOpps, oppsToClose };
  }, [pipelineData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

  const totalPipelineValue = pipelineData.reduce((sum, stage) => sum + stage.value, 0);

  const loading = isLoading || leadsLoading || proposalsLoading || opportunitiesLoading || invoicesLoading;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Pipeline de Vendas
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            Total: {formatCurrency(totalPipelineValue)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Pipeline Funnel */}
        <div className="flex items-center justify-between gap-2 mb-4">
          {pipelineData.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.stage} className="flex items-center flex-1">
                <div className={`flex-1 p-3 rounded-lg ${stage.bgLight} text-center`}>
                  <div className="flex items-center justify-center mb-1">
                    <Icon className={`w-5 h-5 ${stage.textColor}`} />
                  </div>
                  <p className={`text-xl font-bold ${stage.textColor}`}>{stage.count}</p>
                  <p className="text-xs text-muted-foreground">{stage.stage}</p>
                  <p className="text-xs font-medium mt-1">{formatCurrency(stage.value)}</p>
                </div>
                {index < pipelineData.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Conversion Rates */}
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Taxas de Conversão</p>
          <div className="flex items-center justify-between text-xs">
            <div className="text-center">
              <p className="font-semibold text-blue-500">{conversionRates.leadsToProposals}%</p>
              <p className="text-muted-foreground">Lead → Proposta</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-amber-500">{conversionRates.proposalsToOpps}%</p>
              <p className="text-muted-foreground">Proposta → Opp</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-emerald-500">{conversionRates.oppsToClose}%</p>
              <p className="text-muted-foreground">Opp → Fechado</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
