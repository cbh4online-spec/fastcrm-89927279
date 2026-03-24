import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefWatchlist } from "@/hooks/useAccountBriefWatchlist";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Trash2, Loader2, Clock, Play, Pause, Briefcase } from "lucide-react";
import { format } from "date-fns";

const REASON_LABELS: Record<string, string> = {
  strategic: "Conta estratégica",
  high_score: "Score alto",
  competitor: "Concorrente",
  expanding: "Em expansão",
  other: "Outro",
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  manual: "Manual",
};

export default function AccountBriefWatchlistPage() {
  const navigate = useNavigate();
  const { watchlist, isLoading, pauseWatchlist, resumeWatchlist, removeFromWatchlist } = useAccountBriefWatchlist();

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Watchlist"
            description="Contas vigiadas com reanálise automática periódica"
          />

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : watchlist.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-4">Nenhuma conta na watchlist.</p>
                <Button variant="outline" onClick={() => navigate("/dashboard/account-brief/accounts")}>
                  Ver contas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {watchlist.map((item) => {
                const account = item.account_brief_accounts;
                return (
                  <Card key={item.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          onClick={() => navigate(`/dashboard/account-brief/accounts/${item.account_id}`)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-sm shrink-0">
                            {account?.name?.substring(0, 2).toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{account?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{account?.domain}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {REASON_LABELS[item.watch_reason] || item.watch_reason}
                          </Badge>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            {FREQ_LABELS[item.refresh_frequency] || item.refresh_frequency}
                          </Badge>
                          {!item.is_active && (
                            <Badge className="bg-amber-500/20 text-amber-600 text-xs">Pausada</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {item.next_run_at && item.is_active && (
                            <span>Próxima: {format(new Date(item.next_run_at), "dd/MM HH:mm")}</span>
                          )}
                          {item.last_run_at && (
                            <span>Última: {format(new Date(item.last_run_at), "dd/MM HH:mm")}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.is_active ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => pauseWatchlist.mutate(item.id)} title="Pausar">
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => resumeWatchlist.mutate({ watchlistId: item.id, frequency: item.refresh_frequency })} title="Reactivar">
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromWatchlist.mutate(item.id)} title="Remover">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
