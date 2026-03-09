import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLeaderboard } from "@/hooks/usePerformanceScores";
import { Trophy, Medal, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const METRICS = [
  { value: "score_total", label: "Score Total" },
  { value: "revenue_generated", label: "Receita" },
  { value: "pipeline_generated", label: "Pipeline" },
  { value: "meetings_booked", label: "Reuniões" },
  { value: "leads_generated", label: "Leads" },
  { value: "conversion_rate", label: "Conversão" },
];

export default function PerformanceLeaderboardPage() {
  const [metric, setMetric] = useState("score_total");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const { data: leaderboard, isLoading } = useLeaderboard(metric, period);

  const formatValue = (entry: any) => {
    if (metric === "revenue_generated" || metric === "pipeline_generated") {
      return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(entry[metric]);
    }
    if (metric === "conversion_rate") return `${entry[metric]}%`;
    return entry[metric];
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <PageHeader title="Leaderboard" description="Rankings de performance da equipa" />

        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Top 3 Podium */}
        {leaderboard && leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4">
            {[1, 0, 2].map(idx => {
              const entry = leaderboard[idx];
              if (!entry) return null;
              const isFirst = idx === 0;
              return (
                <Card key={entry.id} className={`text-center ${isFirst ? "ring-2 ring-yellow-500/50 shadow-lg" : ""}`}>
                  <CardContent className="pt-6 pb-4">
                    <div className={`mx-auto mb-3 ${isFirst ? "text-4xl" : "text-2xl"}`}>
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                    </div>
                    <Avatar className={`mx-auto ${isFirst ? "h-16 w-16" : "h-12 w-12"} mb-2`}>
                      <AvatarImage src={entry.avatar_url} />
                      <AvatarFallback className="text-lg">{entry.user_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className={`font-semibold ${isFirst ? "text-lg" : "text-sm"}`}>{entry.user_name}</p>
                    <p className="text-xl font-bold mt-1">{formatValue(entry)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Full Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking Completo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}</div>
            ) : !leaderboard?.length ? (
              <p className="text-center text-muted-foreground py-8">Sem dados para o período selecionado</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-8 gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  <span>#</span>
                  <span className="col-span-2">Utilizador</span>
                  <span className="text-right">Receita</span>
                  <span className="text-right">Pipeline</span>
                  <span className="text-right">Reuniões</span>
                  <span className="text-right">Conv.</span>
                  <span className="text-right">Score</span>
                </div>
                {leaderboard.map((entry: any) => (
                  <div key={entry.id} className="grid grid-cols-8 gap-2 px-3 py-3 rounded-lg hover:bg-muted/30 items-center text-sm">
                    <span className="font-bold">{entry.rank}</span>
                    <div className="col-span-2 flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback className="text-xs">{entry.user_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{entry.user_name}</span>
                    </div>
                    <span className="text-right font-medium">
                      {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(entry.revenue_generated)}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(entry.pipeline_generated)}
                    </span>
                    <span className="text-right">{entry.meetings_booked}</span>
                    <span className="text-right">{entry.conversion_rate}%</span>
                    <span className="text-right font-bold">{Math.round(entry.score_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
