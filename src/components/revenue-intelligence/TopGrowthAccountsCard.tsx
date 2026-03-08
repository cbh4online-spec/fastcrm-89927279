import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Building2, Sparkles } from "lucide-react";
import { useTopGrowthAccounts, TopGrowthAccount } from "@/hooks/useRevenueIntelligenceDashboard";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

const signalConfig: Record<string, { label: string; className: string }> = {
  strong: { label: "Forte", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  moderate: { label: "Moderado", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  weak: { label: "Fraco", className: "bg-muted text-muted-foreground border-border" },
  none: { label: "—", className: "bg-muted text-muted-foreground border-border" },
};

function AccountRow({ account, rank }: { account: TopGrowthAccount; rank: number }) {
  const signal = signalConfig[account.buying_signal || "none"] || signalConfig.none;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <span className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        rank <= 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            ICP {account.icp_score ?? 0}
          </span>
          {account.expansion_probability != null && (
            <span className="text-xs text-muted-foreground">
              · Expansão {Math.round(account.expansion_probability * 100)}%
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-semibold text-foreground">
          {account.estimated_arr ? formatCurrency(account.estimated_arr) : "—"}
        </p>
        <Badge variant="outline" className={cn("text-[10px] py-0", signal.className)}>
          {signal.label}
        </Badge>
      </div>
    </div>
  );
}

export function TopGrowthAccountsCard() {
  const { data: accounts, isLoading } = useTopGrowthAccounts(8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Top Growth Accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !accounts?.length ? (
          <div className="text-center py-8">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Execute a análise Revenue Intelligence nas empresas para ver os top accounts.
            </p>
          </div>
        ) : (
          <div>
            {accounts.map((a, i) => (
              <AccountRow key={a.id} account={a} rank={i + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
