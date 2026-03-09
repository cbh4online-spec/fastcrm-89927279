import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, RefreshCw, Loader2, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDealProbabilityScores,
  useRecomputeRevenueFlightControl,
  formatCurrency,
} from "@/hooks/useRevenueFlightControl";

function RFCDealsPage() {
  const navigate = useNavigate();
  const { data: dealScores, isLoading } = useDealProbabilityScores();
  const recompute = useRecomputeRevenueFlightControl();

  const [search, setSearch] = useState("");
  const [probFilter, setProbFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("probability_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = (dealScores || []).filter((d: any) => {
      const opp = d.opportunities;
      if (!opp || ["won", "lost"].includes(opp.status)) return false;
      if (search && !(opp.title?.toLowerCase().includes(search.toLowerCase()) || opp.companies?.name?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (probFilter === "high" && d.probability_score < 70) return false;
      if (probFilter === "medium" && (d.probability_score < 40 || d.probability_score >= 70)) return false;
      if (probFilter === "low" && d.probability_score >= 40) return false;
      if (riskFilter === "high" && d.risk_score < 60) return false;
      if (riskFilter === "medium" && (d.risk_score < 30 || d.risk_score >= 60)) return false;
      if (riskFilter === "low" && d.risk_score >= 30) return false;
      return true;
    });

    list.sort((a: any, b: any) => {
      const aVal = sortBy === "value" ? (a.opportunities?.value || 0) : (a as any)[sortBy] || 0;
      const bVal = sortBy === "value" ? (b.opportunities?.value || 0) : (b as any)[sortBy] || 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

    return list;
  }, [dealScores, search, probFilter, riskFilter, sortBy, sortDir]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/revenue-flight-control")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Deals Intelligence</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} negócios analisados</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
            {recompute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Recalcular</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar negócio ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={probFilter} onValueChange={setProbFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Probabilidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta (≥70%)</SelectItem>
              <SelectItem value="medium">Média (40-70%)</SelectItem>
              <SelectItem value="low">Baixa (&lt;40%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risco" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="high">Alto (≥60)</SelectItem>
              <SelectItem value="medium">Médio (30-60)</SelectItem>
              <SelectItem value="low">Baixo (&lt;30)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Negócio</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Empresa</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Fase</th>
                    <th className="text-right p-3 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("value")}>
                      <span className="flex items-center justify-end gap-1">Valor <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-center p-3 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("probability_score")}>
                      <span className="flex items-center justify-center gap-1">Prob <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-center p-3 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("risk_score")}>
                      <span className="flex items-center justify-center gap-1">Risco <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Health</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Momentum</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Confiança</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Ação Recomendada</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">A carregar...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum negócio encontrado</td></tr>
                  ) : (
                    filtered.map((deal: any) => {
                      const opp = deal.opportunities;
                      return (
                        <tr key={deal.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/dashboard/opportunities/${deal.opportunity_id}`)}>
                          <td className="p-3 font-medium max-w-[200px] truncate">{opp?.title}</td>
                          <td className="p-3 text-muted-foreground">{opp?.companies?.name || "—"}</td>
                          <td className="p-3"><Badge variant="outline" className="text-xs">{opp?.pipeline_stages?.name || "—"}</Badge></td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(opp?.value || 0)}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={cn("text-xs",
                              deal.probability_score >= 70 ? "text-emerald-400 border-emerald-400/30" :
                              deal.probability_score >= 40 ? "text-amber-400 border-amber-400/30" :
                              "text-red-400 border-red-400/30"
                            )}>{deal.probability_score}%</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={cn("text-xs",
                              deal.risk_score >= 60 ? "text-red-400 border-red-400/30" :
                              deal.risk_score >= 30 ? "text-amber-400 border-amber-400/30" :
                              "text-emerald-400 border-emerald-400/30"
                            )}>{deal.risk_score}</Badge>
                          </td>
                          <td className="p-3 text-center">{deal.health_score}</td>
                          <td className="p-3 text-center">{deal.momentum_score}</td>
                          <td className="p-3 text-center">{deal.confidence_score}</td>
                          <td className="p-3 text-xs text-muted-foreground max-w-[180px] truncate">{deal.recommended_action}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default RFCDealsPage;
