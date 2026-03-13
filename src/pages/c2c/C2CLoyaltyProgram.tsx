import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NexusPageHeader } from "@/components/dashboard/nexus/NexusPageHeader";
import { Gift, Star, ShoppingBag, Trophy, Zap, Loader2 } from "lucide-react";

const TIERS = [
  { name: "bronze", minPoints: 0, color: "text-amber-700", bg: "bg-amber-100" },
  { name: "silver", minPoints: 500, color: "text-gray-500", bg: "bg-gray-100" },
  { name: "gold", minPoints: 2000, color: "text-yellow-500", bg: "bg-yellow-100" },
  { name: "platinum", minPoints: 5000, color: "text-blue-400", bg: "bg-blue-100" },
];

function useC2CLoyalty(workspaceId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-loyalty", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return null;
      const { data } = await supabase
        .from("c2c_loyalty_points")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId && !!user,
  });
}

function useC2CLoyaltyTransactions(workspaceId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-loyalty-transactions", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data } = await supabase
        .from("c2c_loyalty_transactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!workspaceId && !!user,
  });
}

const typeIcons: Record<string, any> = {
  purchase: ShoppingBag,
  review: Star,
  referral: Gift,
  milestone: Trophy,
  bonus: Zap,
};

export default function C2CLoyaltyProgram() {
  const { t } = useTranslation('marketplace');
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: loyalty, isLoading } = useC2CLoyalty(wid);
  const { data: transactions = [] } = useC2CLoyaltyTransactions(wid);

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const points = loyalty?.points || 0;
  const lifetime = loyalty?.lifetime_points || 0;
  const currentTier = TIERS.slice().reverse().find(t => lifetime >= t.minPoints) || TIERS[0];
  const nextTier = TIERS.find(t => t.minPoints > lifetime);
  const progress = nextTier ? ((lifetime - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100 : 100;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <NexusPageHeader icon={Gift} title={t('loyaltyTitle')} subtitle={t('loyaltyDesc')} />

      {/* Tier Card */}
      <Card className="overflow-hidden">
        <div className={`p-6 ${currentTier.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('loyaltyCurrentTier')}</p>
              <h2 className={`text-3xl font-bold capitalize ${currentTier.color}`}>
                <Trophy className="h-7 w-7 inline mr-2" />
                {t(`loyaltyTier${currentTier.name.charAt(0).toUpperCase() + currentTier.name.slice(1)}`)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{points.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t('loyaltyPoints')}</p>
            </div>
          </div>
          {nextTier && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t('loyaltyNextTier')}: {t(`loyaltyTier${nextTier.name.charAt(0).toUpperCase() + nextTier.name.slice(1)}`)}</span>
                <span>{nextTier.minPoints - lifetime} {t('loyaltyPointsToGo')}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </Card>

      {/* How to earn */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('loyaltyHowToEarn')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: ShoppingBag, label: t('loyaltyEarnPurchase'), points: "10 pts/€" },
              { icon: Star, label: t('loyaltyEarnReview'), points: "50 pts" },
              { icon: Gift, label: t('loyaltyEarnReferral'), points: "200 pts" },
              { icon: Trophy, label: t('loyaltyEarnMilestone'), points: "500 pts" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="p-2 rounded-lg bg-primary/10"><item.icon className="h-4 w-4 text-primary" /></div>
                <div className="flex-1"><p className="text-sm font-medium">{item.label}</p></div>
                <Badge variant="secondary" className="text-xs">{item.points}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('loyaltyHistory')}</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('loyaltyNoTransactions')}</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => {
                const Icon = typeIcons[tx.type] || Zap;
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="p-1.5 rounded-lg bg-muted"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-semibold ${tx.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
