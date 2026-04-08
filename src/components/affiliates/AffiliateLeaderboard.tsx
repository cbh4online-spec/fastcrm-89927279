import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  conversions: number;
  revenue: number;
}

interface Props {
  entries: LeaderboardEntry[];
  myRank?: number;
}

const RANK_ICONS = [Trophy, Medal, Award];
const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export function AffiliateLeaderboard({ entries, myRank }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Top Afiliados do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem dados este mês</p>}
        {entries.map((e) => {
          const Icon = RANK_ICONS[e.rank - 1];
          const color = RANK_COLORS[e.rank - 1];
          return (
            <div key={e.rank}
              className={`flex items-center gap-3 rounded-lg p-3 ${e.rank <= 3 ? "bg-primary/5 border border-primary/10" : "bg-muted/30"}`}>
              <div className="flex-shrink-0 w-8 text-center">
                {Icon ? <Icon className={`h-5 w-5 mx-auto ${color}`} /> : <span className="text-sm font-bold text-muted-foreground">#{e.rank}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.conversions} conversões</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">€{e.revenue.toFixed(0)}</Badge>
            </div>
          );
        })}
        {myRank && myRank > 10 && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">A sua posição: <span className="font-bold text-foreground">#{myRank}</span></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}