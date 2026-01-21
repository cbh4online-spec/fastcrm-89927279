import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCreditProposals } from "../hooks/useCreditProposals";
import { useBankPartners } from "../hooks/useBankPartners";
import { 
  CREDIT_TYPE_LABELS, 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUS_COLORS,
  ProposalStatus 
} from "../types";
import { 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Euro,
  Building2,
  AlertCircle,
  ArrowUpRight
} from "lucide-react";

export function CreditDashboard() {
  const { data: proposals = [], isLoading } = useCreditProposals();
  const { data: banks = [] } = useBankPartners();

  // Calculate stats
  const activeStatuses: ProposalStatus[] = [
    "draft", "collecting_docs", "analysis", "submitted", 
    "bank_analysis", "pre_approved", "approved", "signing"
  ];
  const activeProposals = proposals.filter(p => activeStatuses.includes(p.status as ProposalStatus));
  const fundedProposals = proposals.filter(p => p.status === "funded");
  const pendingProposals = proposals.filter(p => 
    ["submitted", "bank_analysis"].includes(p.status)
  );

  const totalPipelineValue = activeProposals.reduce(
    (sum, p) => sum + (p.amount_requested || 0), 0
  );
  const totalFundedValue = fundedProposals.reduce(
    (sum, p) => sum + (p.approved_amount || p.amount_requested || 0), 0
  );
  const pendingCommission = fundedProposals
    .filter(p => !p.commission_paid)
    .reduce((sum, p) => sum + (p.commission_amount || 0), 0);

  const approvalRate = proposals.length > 0
    ? (fundedProposals.length / proposals.length) * 100
    : 0;

  // Group by status
  const statusCounts = proposals.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by credit type
  const typeCounts = proposals.reduce((acc, p) => {
    acc[p.credit_type] = (acc[p.credit_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Ativo
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeProposals.length} propostas em curso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Financiado
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalFundedValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fundedProposals.length} créditos aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Análise Bancária
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProposals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              A aguardar resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissões Pendentes
            </CardTitle>
            <Euro className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(pendingCommission)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              A receber
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Approval Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa de Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{approvalRate.toFixed(0)}%</span>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <Progress value={approvalRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {fundedProposals.length} de {proposals.length} propostas aprovadas
            </p>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className={PROPOSAL_STATUS_COLORS[status as ProposalStatus] || ""}
                    >
                      {PROPOSAL_STATUS_LABELS[status as ProposalStatus] || status}
                    </Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* By Credit Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Por Tipo de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">
                      {CREDIT_TYPE_LABELS[type as keyof typeof CREDIT_TYPE_LABELS] || type}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              {Object.keys(typeCounts).length === 0 && (
                <p className="text-sm text-muted-foreground">Sem propostas</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banks Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Parceiros Bancários
          </CardTitle>
          <CardDescription>
            {banks.filter(b => b.is_active).length} bancos ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {banks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {banks.filter(b => b.is_active).slice(0, 4).map(bank => (
                <div 
                  key={bank.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{bank.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bank.credit_types?.length || 0} tipos de crédito
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Adicione parceiros bancários para começar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
