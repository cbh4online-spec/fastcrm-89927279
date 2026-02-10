import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Crown, Medal, Award, Flame, Star, TrendingUp, Users, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getTierProgress } from "@/hooks/useLoyalty";

interface CommunityLeaderboardProps {
  workspaceId: string | undefined;
}

interface LeaderboardEntry {
  user_id: string;
  lifetime_points: number;
  balance: number;
  tier: string;
  profile?: { full_name: string | null } | null;
}

type Period = "lifetime" | "month" | "week" | "today";

const periodLabels: Record<Period, string> = {
  lifetime: "Sempre",
  month: "Este mês",
  week: "Esta semana",
  today: "Hoje",
};

const tierColors: Record<string, string> = {
  bronze: "from-amber-700 to-amber-900",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-400 to-amber-500",
  platinum: "from-cyan-300 to-blue-500",
};

const tierBorderColors: Record<string, string> = {
  bronze: "border-amber-700/40",
  silver: "border-slate-400/40",
  gold: "border-yellow-400/40",
  platinum: "border-cyan-400/40",
};

const tierProgressColors: Record<string, string> = {
  bronze: "bg-amber-600",
  silver: "bg-slate-400",
  gold: "bg-yellow-500",
  platinum: "bg-cyan-400",
};

const tierLabels: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

// --- CountUp hook ---
function useCountUp(target: number, duration = 1500, enabled = true) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    if (!enabled) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration, enabled]);
  return value;
}

function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{animated.toLocaleString()}</span>;
}

// --- Stats Banner ---
function StatsBar({ entries }: { entries: LeaderboardEntry[] }) {
  const totalPoints = entries.reduce((sum, e) => sum + e.lifetime_points, 0);
  const topMember = entries[0];
  const memberCount = entries.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-3 gap-3 mb-6"
    >
      <div className="rounded-xl border bg-card p-4 text-center space-y-1">
        <Zap className="h-5 w-5 text-primary mx-auto" />
        <CountUpNumber value={totalPoints} className="text-xl font-bold text-foreground block" />
        <p className="text-[11px] text-muted-foreground">Pontos totais</p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-center space-y-1">
        <Target className="h-5 w-5 text-primary mx-auto" />
        <p className="text-sm font-bold text-foreground truncate">{topMember?.profile?.full_name || "—"}</p>
        <p className="text-[11px] text-muted-foreground">Mais activo</p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-center space-y-1">
        <Users className="h-5 w-5 text-primary mx-auto" />
        <CountUpNumber value={memberCount} className="text-xl font-bold text-foreground block" />
        <p className="text-[11px] text-muted-foreground">Membros</p>
      </div>
    </motion.div>
  );
}

// --- Period Filter ---
function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
      {(Object.keys(periodLabels) as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
            value === p
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          {periodLabels[p]}
        </button>
      ))}
    </div>
  );
}

// --- Podium Card ---
function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const isFirst = position === 1;
  const tierInfo = getTierProgress(entry.lifetime_points);
  const sizes = {
    1: "h-20 w-20",
    2: "h-14 w-14",
    3: "h-14 w-14",
  };
  const iconMap = {
    1: <Crown className="h-6 w-6 text-yellow-400" />,
    2: <Medal className="h-5 w-5 text-slate-400" />,
    3: <Award className="h-5 w-5 text-amber-700" />,
  };
  const borderMap = {
    1: "border-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.15)]",
    2: "border-slate-400/40",
    3: "border-amber-700/40",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: position === 1 ? 0.2 : position === 2 ? 0.1 : 0.3 }}
      whileHover={{ scale: 1.04, y: -4 }}
      className={cn(
        "flex flex-col items-center text-center p-4 rounded-2xl border-2 bg-card relative",
        borderMap[position],
        isFirst ? "order-2 -mt-4 z-10" : position === 2 ? "order-1 mt-2" : "order-3 mt-2"
      )}
    >
      {/* Shimmer overlay for 1st place */}
      {isFirst && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-[shimmer_3s_infinite] -translate-x-full" />
        </div>
      )}

      <div className="mb-1">{iconMap[position]}</div>
      <Avatar className={cn(sizes[position], "mb-2 ring-2 ring-offset-2 ring-offset-card", isFirst ? "ring-yellow-400/50" : position === 2 ? "ring-slate-400/30" : "ring-amber-700/30")}>
        <AvatarFallback className={cn("font-bold text-white bg-gradient-to-br", tierColors[entry.tier] || tierColors.bronze, isFirst ? "text-lg" : "text-sm")}>
          {(entry.profile?.full_name || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className={cn("font-semibold truncate max-w-[100px]", isFirst ? "text-sm" : "text-xs")}>{entry.profile?.full_name || "Membro"}</p>
      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{tierLabels[entry.tier] || entry.tier}</Badge>
      <CountUpNumber value={entry.lifetime_points} className={cn("font-bold mt-2 block", isFirst ? "text-lg text-primary" : "text-sm text-foreground")} />
      <p className="text-[10px] text-muted-foreground">pontos</p>
    </motion.div>
  );
}

// --- Podium Section ---
function PodiumSection({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length < 2) return null;
  const top3 = entries.slice(0, Math.min(3, entries.length));
  return (
    <div className="flex items-end justify-center gap-3 mb-8 px-2">
      {top3[1] && <PodiumCard entry={top3[1]} position={2} />}
      {top3[0] && <PodiumCard entry={top3[0]} position={1} />}
      {top3[2] && <PodiumCard entry={top3[2]} position={3} />}
    </div>
  );
}

// --- Achievement Badges ---
function AchievementBadges({ position, tier }: { position: number; tier: string }) {
  return (
    <div className="flex gap-0.5">
      {position < 5 && <Star className="h-3.5 w-3.5 text-yellow-500" />}
      {tier === "platinum" && <Flame className="h-3.5 w-3.5 text-orange-500" />}
      {position < 3 && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
    </div>
  );
}

// --- Leaderboard Row ---
function LeaderboardRow({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const tierInfo = getTierProgress(entry.lifetime_points);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (position - 3) * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      className={cn("flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors")}
    >
      <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">{position + 1}</span>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={cn("font-semibold text-sm text-white bg-gradient-to-br", tierColors[entry.tier] || tierColors.bronze)}>
          {(entry.profile?.full_name || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{entry.profile?.full_name || "Membro"}</p>
          <AchievementBadges position={position} tier={entry.tier} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0">{tierLabels[entry.tier] || entry.tier}</Badge>
          {tierInfo.next && (
            <div className="flex-1 flex items-center gap-1.5 max-w-[120px]">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", tierProgressColors[tierInfo.tier])} style={{ width: `${tierInfo.progress}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">{tierInfo.progress}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground">{entry.lifetime_points.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">pontos</p>
      </div>
    </motion.div>
  );
}

// --- Main Component ---
export function CommunityLeaderboard({ workspaceId }: CommunityLeaderboardProps) {
  const [period, setPeriod] = useState<Period>("lifetime");

  // Lifetime query
  const { data: lifetimeEntries = [], isLoading: loadingLifetime } = useQuery({
    queryKey: ["community-leaderboard", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("user_id, lifetime_points, balance, tier")
        .eq("workspace_id", workspaceId)
        .order("lifetime_points", { ascending: false })
        .limit(25);
      if (error) throw error;

      const userIds = (data || []).map(d => d.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return (data || []).map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || null,
      })) as LeaderboardEntry[];
    },
    enabled: !!workspaceId,
  });

  // Period-based query
  const getDateFilter = (p: Period): string | null => {
    const now = new Date();
    if (p === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (p === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
    if (p === "month") { const d = new Date(now.getFullYear(), now.getMonth(), 1); return d.toISOString(); }
    return null;
  };

  const { data: periodEntries = [], isLoading: loadingPeriod } = useQuery({
    queryKey: ["community-leaderboard-period", workspaceId, period],
    queryFn: async () => {
      if (!workspaceId || period === "lifetime") return [];
      const dateFrom = getDateFilter(period);
      if (!dateFrom) return [];

      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("user_id, points")
        .eq("workspace_id", workspaceId)
        .gte("created_at", dateFrom)
        .gt("points", 0);
      if (error) throw error;

      // Aggregate by user
      const agg = new Map<string, number>();
      (data || []).forEach(tx => {
        agg.set(tx.user_id, (agg.get(tx.user_id) || 0) + tx.points);
      });

      const sorted = Array.from(agg.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25);

      if (sorted.length === 0) return [];

      // Get tier info from loyalty_points
      const userIds = sorted.map(([uid]) => uid);
      const { data: lpData } = await supabase
        .from("loyalty_points")
        .select("user_id, lifetime_points, balance, tier")
        .eq("workspace_id", workspaceId)
        .in("user_id", userIds);
      const lpMap = new Map(lpData?.map(lp => [lp.user_id, lp]));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return sorted.map(([uid, pts]) => ({
        user_id: uid,
        lifetime_points: pts,
        balance: lpMap.get(uid)?.balance || 0,
        tier: lpMap.get(uid)?.tier || "bronze",
        profile: profileMap.get(uid) || null,
      })) as LeaderboardEntry[];
    },
    enabled: !!workspaceId && period !== "lifetime",
  });

  const entries = period === "lifetime" ? lifetimeEntries : periodEntries;
  const isLoading = period === "lifetime" ? loadingLifetime : loadingPeriod;

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">A carregar classificação...</p>;

  if (entries.length === 0) {
    return (
      <div>
        <PeriodFilter value={period} onChange={setPeriod} />
        <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20">
          <Trophy className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <p className="font-semibold">Sem classificação ainda</p>
          <p className="text-sm text-muted-foreground">Participa para aparecer no leaderboard!</p>
        </div>
      </div>
    );
  }

  const restEntries = entries.slice(3);

  return (
    <div>
      <StatsBar entries={entries} />
      <PeriodFilter value={period} onChange={setPeriod} />
      <PodiumSection entries={entries} />

      {restEntries.length > 0 && (
        <div className="space-y-2">
          {restEntries.map((entry, i) => (
            <LeaderboardRow key={entry.user_id} entry={entry} position={i + 3} />
          ))}
        </div>
      )}
    </div>
  );
}
