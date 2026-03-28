import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PerformanceChallenge, useChallengeParticipants, useJoinChallenge, useLeaveChallenge, useUpdateChallengeStatus, useDeleteChallenge } from "@/hooks/usePerformanceChallenges";
import { DollarSign, CalendarCheck, TrendingUp, Handshake, Trophy, Clock, Users, Play, Pause, Square, Trash2, LogIn, LogOut, Gift, Medal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: any; color: string }> = {
  revenue_sprint: { icon: DollarSign, color: "text-green-600 bg-green-500/10" },
  meeting_sprint: { icon: CalendarCheck, color: "text-blue-600 bg-blue-500/10" },
  pipeline_builder: { icon: TrendingUp, color: "text-purple-600 bg-purple-500/10" },
  deal_closer: { icon: Handshake, color: "text-orange-600 bg-orange-500/10" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  paused: { label: "Pausado", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  completed: { label: "Concluído", color: "bg-muted text-muted-foreground border-border" },
};

interface ChallengeDetailSheetProps {
  challenge: PerformanceChallenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (challenge: PerformanceChallenge) => void;
}

export function ChallengeDetailSheet({ challenge, open, onOpenChange, onEdit }: ChallengeDetailSheetProps) {
  const { data: participants, isLoading } = useChallengeParticipants(challenge?.id || null);
  const joinChallenge = useJoinChallenge();
  const leaveChallenge = useLeaveChallenge();
  const updateStatus = useUpdateChallengeStatus();
  const deleteChallenge = useDeleteChallenge();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  if (!challenge) return null;

  const tc = typeConfig[challenge.challenge_type] || typeConfig.revenue_sprint;
  const sc = statusConfig[challenge.status] || statusConfig.active;
  const TypeIcon = tc.icon;

  const daysTotal = Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / 86400000);
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000));
  const timeProgress = daysTotal > 0 ? Math.round(((daysTotal - daysLeft) / daysTotal) * 100) : 0;

  const totalValue = participants?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
  const goalProgress = challenge.target_value > 0 ? Math.min(100, Math.round((totalValue / challenge.target_value) * 100)) : 0;

  const isParticipant = participants?.some(p => p.user_id === currentUserId);
  const isActive = challenge.status === "active";

  const handleJoin = async () => {
    if (!currentUserId || !challenge) return;
    try {
      await joinChallenge.mutateAsync({ challengeId: challenge.id, userId: currentUserId });
      toast.success("Inscrito no desafio!");
    } catch { toast.error("Erro ao inscrever"); }
  };

  const handleLeave = async () => {
    if (!currentUserId || !challenge) return;
    try {
      await leaveChallenge.mutateAsync({ challengeId: challenge.id, userId: currentUserId });
      toast.success("Saíste do desafio");
    } catch { toast.error("Erro ao sair"); }
  };

  const handleStatus = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: challenge.id, status });
      toast.success(`Desafio ${status === "active" ? "ativado" : status === "paused" ? "pausado" : "encerrado"}`);
    } catch { toast.error("Erro ao alterar estado"); }
  };

  const handleDelete = async () => {
    if (participants?.length) {
      toast.error("Remove todos os participantes antes de eliminar");
      return;
    }
    try {
      await deleteChallenge.mutateAsync(challenge.id);
      toast.success("Desafio eliminado");
      onOpenChange(false);
    } catch { toast.error("Erro ao eliminar"); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", tc.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">{challenge.challenge_name}</SheetTitle>
              <Badge variant="outline" className={cn("mt-1", sc.color)}>{sc.label}</Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {challenge.description && (
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          )}

          {/* Time progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Progresso temporal</span>
              <span className="font-medium">{daysLeft}d restantes</span>
            </div>
            <Progress value={timeProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{challenge.start_date}</span>
              <span>{challenge.end_date}</span>
            </div>
          </div>

          {/* Goal progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Trophy className="h-3.5 w-3.5" /> Progresso da meta</span>
              <span className="font-medium">{goalProgress}%</span>
            </div>
            <Progress value={goalProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{totalValue} / {challenge.target_value}</p>
          </div>

          {/* Reward */}
          {(challenge.reward_type || challenge.reward_value) && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <Gift className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-amber-700">
                  {challenge.reward_type === "bonus" ? "Bónus" : challenge.reward_type === "prize" ? "Prémio" : "Reconhecimento"}
                </span>
                {challenge.reward_value && <span className="text-muted-foreground"> — {challenge.reward_value}</span>}
              </div>
            </div>
          )}

          <Separator />

          {/* Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5"><Users className="h-4 w-4" /> Leaderboard</h4>
              <span className="text-xs text-muted-foreground">{participants?.length || 0} participantes</span>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">A carregar...</p>
            ) : !participants?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem participantes inscritos</p>
            ) : (
              <div className="space-y-1.5">
                {participants.map((p, idx) => {
                  const pctOfTarget = challenge.target_value > 0 ? Math.min(100, Math.round((p.current_value / challenge.target_value) * 100)) : 0;
                  return (
                    <div key={p.id} className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg transition-colors",
                      idx === 0 ? "bg-amber-500/5 border border-amber-500/15" :
                      idx === 1 ? "bg-muted/60" :
                      idx === 2 ? "bg-muted/30" : "bg-card"
                    )}>
                      <span className="w-5 text-center font-bold text-xs text-muted-foreground">
                        {idx === 0 ? <Medal className="h-4 w-4 text-amber-500 mx-auto" /> : idx + 1}
                      </span>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{p.user_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.user_name}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={pctOfTarget} className="h-1 flex-1" />
                          <span className="text-[10px] text-muted-foreground shrink-0">{pctOfTarget}%</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{p.current_value}</p>
                        <p className="text-[10px] text-muted-foreground">{p.points} pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Join/Leave */}
          {isActive && currentUserId && (
            <div>
              {isParticipant ? (
                <Button variant="outline" className="w-full" onClick={handleLeave} disabled={leaveChallenge.isPending}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair do Desafio
                </Button>
              ) : (
                <Button className="w-full" onClick={handleJoin} disabled={joinChallenge.isPending}>
                  <LogIn className="h-4 w-4 mr-2" /> Participar
                </Button>
              )}
            </div>
          )}

          {/* Admin actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { onEdit(challenge); onOpenChange(false); }}>
              Editar
            </Button>
            {challenge.status === "active" && (
              <Button variant="outline" size="sm" onClick={() => handleStatus("paused")} disabled={updateStatus.isPending}>
                <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
              </Button>
            )}
            {challenge.status === "paused" && (
              <Button variant="outline" size="sm" onClick={() => handleStatus("active")} disabled={updateStatus.isPending}>
                <Play className="h-3.5 w-3.5 mr-1" /> Retomar
              </Button>
            )}
            {challenge.status !== "completed" && (
              <Button variant="outline" size="sm" onClick={() => handleStatus("completed")} disabled={updateStatus.isPending}>
                <Square className="h-3.5 w-3.5 mr-1" /> Encerrar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleteChallenge.isPending}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
