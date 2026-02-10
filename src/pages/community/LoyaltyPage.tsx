import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLoyaltyProfile, useLoyaltyTransactions, useLoyaltyRewards, useRedeemReward, getTierProgress } from "@/hooks/useLoyalty";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, Star, Gift, Trophy, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const tierColors: Record<string, string> = {
  bronze: "bg-accent text-accent-foreground border-border",
  silver: "bg-muted text-muted-foreground border-border",
  gold: "bg-primary/10 text-primary border-primary/30",
  platinum: "bg-secondary text-secondary-foreground border-border",
};

const tierLabels: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: profile } = useLoyaltyProfile(workspaceId);
  const { data: transactions = [] } = useLoyaltyTransactions(workspaceId);
  const { data: rewards = [] } = useLoyaltyRewards(workspaceId);
  const redeemReward = useRedeemReward(workspaceId);

  const tierInfo = profile ? getTierProgress(profile.lifetime_points) : getTierProgress(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/fastclub")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> FastClub
        </Button>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Trophy className="h-6 w-6 text-primary" />
          Recompensas FastClub
        </h1>

        {/* Points & Tier Card */}
        <div className="border rounded-xl p-6 bg-card mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo atual</p>
              <p className="text-3xl font-bold text-foreground">{profile?.balance || 0} <span className="text-base font-normal text-muted-foreground">pontos</span></p>
            </div>
            <Badge className={`text-sm px-3 py-1 ${tierColors[tierInfo.tier]}`}>
              {tierLabels[tierInfo.tier]}
            </Badge>
          </div>

          {tierInfo.next && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{tierLabels[tierInfo.tier]}</span>
                <span>{tierLabels[tierInfo.next]}</span>
              </div>
              <Progress value={tierInfo.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{tierInfo.progress}% para {tierLabels[tierInfo.next]}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Total acumulado: {profile?.lifetime_points || 0} pontos
          </div>
        </div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Recompensas
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {rewards.map(reward => {
                const canRedeem = (profile?.balance || 0) >= reward.points_cost;
                return (
                  <div key={reward.id} className="border rounded-xl p-4 bg-card space-y-2">
                    <h3 className="font-medium">{reward.name}</h3>
                    {reward.description && <p className="text-xs text-muted-foreground">{reward.description}</p>}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{reward.points_cost} pontos</Badge>
                      <Button
                        size="sm"
                        disabled={!canRedeem || redeemReward.isPending}
                        onClick={() => redeemReward.mutate(reward)}
                      >
                        Resgatar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> Histórico
          </h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem transações</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "d MMM yyyy", { locale: pt })}</p>
                  </div>
                  <span className={`font-bold text-sm ${tx.points > 0 ? "text-primary" : "text-destructive"}`}>
                    {tx.points > 0 ? "+" : ""}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
