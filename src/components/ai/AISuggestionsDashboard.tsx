import { useAISuggestionsHistory } from "@/hooks/useAISuggestionsHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  BarChart3,
  Target,
  Users,
  Building2,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const ENTITY_ICONS: Record<string, typeof Target> = {
  lead: Target,
  contact: Users,
  company: Building2,
  opportunity: Briefcase,
};

const ENTITY_LABELS: Record<string, string> = {
  lead: "Leads",
  contact: "Contactos",
  company: "Empresas",
  opportunity: "Oportunidades",
};

const STATUS_COLORS = {
  accepted: "hsl(var(--chart-2))",
  rejected: "hsl(var(--chart-1))",
  pending: "hsl(var(--chart-3))",
  expired: "hsl(var(--chart-4))",
};

const CONFIDENCE_COLORS = {
  high: "hsl(var(--chart-2))",
  medium: "hsl(var(--chart-3))",
  low: "hsl(var(--chart-1))",
};

export function AISuggestionsDashboard() {
  const { data: stats, isLoading, error } = useAISuggestionsHistory();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Erro ao carregar estatísticas: {error.message}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const statusData = [
    { name: "Aceites", value: stats.accepted, color: STATUS_COLORS.accepted },
    { name: "Rejeitadas", value: stats.rejected, color: STATUS_COLORS.rejected },
    { name: "Pendentes", value: stats.pending, color: STATUS_COLORS.pending },
    { name: "Expiradas", value: stats.expired, color: STATUS_COLORS.expired },
  ].filter(d => d.value > 0);

  const confidenceData = [
    { 
      name: "Alta (≥75%)", 
      total: stats.byConfidenceRange.high.total,
      accepted: stats.byConfidenceRange.high.accepted,
      rate: stats.byConfidenceRange.high.total > 0 
        ? Math.round((stats.byConfidenceRange.high.accepted / stats.byConfidenceRange.high.total) * 100)
        : 0,
    },
    { 
      name: "Média (50-75%)", 
      total: stats.byConfidenceRange.medium.total,
      accepted: stats.byConfidenceRange.medium.accepted,
      rate: stats.byConfidenceRange.medium.total > 0 
        ? Math.round((stats.byConfidenceRange.medium.accepted / stats.byConfidenceRange.medium.total) * 100)
        : 0,
    },
    { 
      name: "Baixa (<50%)", 
      total: stats.byConfidenceRange.low.total,
      accepted: stats.byConfidenceRange.low.accepted,
      rate: stats.byConfidenceRange.low.total > 0 
        ? Math.round((stats.byConfidenceRange.low.accepted / stats.byConfidenceRange.low.total) * 100)
        : 0,
    },
  ];

  const fieldData = Object.entries(stats.byField)
    .map(([name, data]) => ({
      name,
      total: data.total,
      accepted: data.accepted,
      rejected: data.rejected,
      rate: Math.round(data.acceptanceRate),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const chartConfig = {
    total: { label: "Total", color: "hsl(var(--chart-1))" },
    accepted: { label: "Aceites", color: "hsl(var(--chart-2))" },
    rejected: { label: "Rejeitadas", color: "hsl(var(--chart-1))" },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões IA</h1>
          <p className="text-muted-foreground">Histórico e estatísticas de sugestões de campos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Sugestões</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{stats.totalSuggestions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Aceitação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-2" />
              <span className="text-3xl font-bold">
                {stats.acceptanceRate.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.accepted} aceites / {stats.accepted + stats.rejected} avaliadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confiança Média</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-chart-3" />
              <span className="text-3xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acceptance by Confidence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aceitação por Nível de Confiança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confidenceData.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.accepted}/{item.total} ({item.rate}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-chart-2 transition-all"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Entity Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Tipo de Entidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byEntityType).map(([type, data]) => {
              const Icon = ENTITY_ICONS[type] || Target;
              const label = ENTITY_LABELS[type] || type;
              const rate = data.accepted + data.rejected > 0
                ? Math.round((data.accepted / (data.accepted + data.rejected)) * 100)
                : 0;
              
              return (
                <div key={type} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{data.total}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-chart-2" />
                    <span>{data.accepted}</span>
                    <XCircle className="h-3 w-3 text-chart-1" />
                    <span>{data.rejected}</span>
                    <span className="ml-auto">{rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Fields */}
      {fieldData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Campos com Sugestões</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fieldData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="accepted" stackId="a" fill="hsl(var(--chart-2))" name="Aceites" />
                  <Bar dataKey="rejected" stackId="a" fill="hsl(var(--chart-1))" name="Rejeitadas" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sugestões Recentes</CardTitle>
          <CardDescription>Últimas 50 sugestões geradas</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentSuggestions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSuggestions.slice(0, 20).map((suggestion) => {
                const Icon = ENTITY_ICONS[suggestion.entity_type] || Target;
                
                return (
                  <div 
                    key={suggestion.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{suggestion.field_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.field_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {typeof suggestion.suggested_value === "object" 
                          ? JSON.stringify(suggestion.suggested_value)
                          : String(suggestion.suggested_value)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.round(suggestion.confidence * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(suggestion.created_at), "dd MMM", { locale: pt })}
                        </p>
                      </div>
                      
                      <StatusBadge status={suggestion.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma sugestão gerada ainda</p>
              <p className="text-sm mt-1">
                As sugestões aparecerão aqui após serem geradas nas páginas de detalhe
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "accepted":
      return (
        <Badge className="bg-chart-2/20 text-chart-2 hover:bg-chart-2/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Aceite
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-chart-1/20 text-chart-1 hover:bg-chart-1/30">
          <XCircle className="h-3 w-3 mr-1" />
          Rejeitada
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Expirada
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
