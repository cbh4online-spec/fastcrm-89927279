import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function CommunityLeaderboard({ workspaceId }: CommunityLeaderboardProps) {
  const { data: entries = [], isLoading } = useQuery({
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

      // Get profiles
      const userIds = (data || []).map(d => d.user_id);
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

  const positionIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-primary" />;
    if (i === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (i === 2) return <Award className="h-5 w-5 text-accent-foreground" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">A carregar classificação...</p>;

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20">
        <Trophy className="h-10 w-10 text-primary/40 mx-auto mb-3" />
        <p className="font-semibold">Sem classificação ainda</p>
        <p className="text-sm text-muted-foreground">Participa para aparecer no leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div
          key={entry.user_id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
            i < 3 ? "bg-primary/[0.03] border-primary/20" : "bg-card"
          )}
        >
          <div className="w-8 flex justify-center shrink-0">{positionIcon(i)}</div>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {(entry.profile?.full_name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{entry.profile?.full_name || "Membro"}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{entry.tier}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-foreground">{entry.lifetime_points.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">pontos</p>
          </div>
        </div>
      ))}
    </div>
  );
}
