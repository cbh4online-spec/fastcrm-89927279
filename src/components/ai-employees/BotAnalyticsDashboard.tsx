import { useBotAnalytics, Bot } from "@/hooks/useBots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Users,
  CalendarDays,
  ArrowRightLeft,
  TrendingUp,
  Clock,
} from "lucide-react";

interface BotAnalyticsDashboardProps {
  bot: Bot;
}

export function BotAnalyticsDashboard({ bot }: BotAnalyticsDashboardProps) {
  const { data, isLoading } = useBotAnalytics(bot.id);

  const metrics = [
    {
      label: "Conversas",
      value: data?.totals.total_conversations ?? 0,
      icon: MessageSquare,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "Leads Geradas",
      value: data?.totals.total_leads ?? 0,
      icon: Users,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "Reuniões Marcadas",
      value: data?.totals.total_bookings ?? 0,
      icon: CalendarDays,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      label: "Handovers",
      value: data?.totals.handover_count ?? 0,
      icon: ArrowRightLeft,
      color: "text-amber-500 bg-amber-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const hasData = (data?.totals.total_conversations ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData && (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sem dados de analytics ainda</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Ativa o bot e inicia conversas para ver métricas aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
