import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, Zap } from "lucide-react";
import { mockSprints, mockDailyBriefings, mockWins } from "./mockData";

export function VisionMetricsPanel() {
  const completedSprints = mockSprints.filter(s => s.status === "completed").length;
  const avgEnergy = mockDailyBriefings.length > 0
    ? Math.round(mockDailyBriefings.reduce((sum, b) => sum + (b.energy_level || 0), 0) / mockDailyBriefings.length)
    : 0;
  const totalTasksDone = mockSprints.reduce((sum, s) => sum + s.metrics.tasks_done, 0);
  const totalLeads = mockSprints.reduce((sum, s) => sum + s.metrics.leads_generated, 0);

  const stats = [
    { label: "Sprints Concluídos", value: completedSprints, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Tarefas Feitas", value: totalTasksDone, icon: BarChart3, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Energia Média", value: `${avgEnergy}/10`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Leads Gerados", value: totalLeads, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Métricas da Visão</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Histórico de Energia Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {mockDailyBriefings.map((b) => (
              <div key={b.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-violet-500 to-purple-400 min-w-[24px]"
                  style={{ height: `${(b.energy_level / 10) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{b.date.split("-")[2]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Vitórias por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(
              mockWins.reduce((acc, w) => { acc[w.category] = (acc[w.category] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-foreground capitalize">{cat}</span>
                <span className="text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
