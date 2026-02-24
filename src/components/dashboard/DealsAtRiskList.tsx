import { useOpportunities } from "@/hooks/useOpportunities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/hooks/useRevenueForecast";

export function DealsAtRiskList() {
  const { data: opportunities, isLoading } = useOpportunities();
  const navigate = useNavigate();

  const atRisk = opportunities
    ?.filter((o: any) => o.status === "open" && (o.confidence || 0) < 40)
    ?.sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
    ?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Deals at Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        {atRisk.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No deals at risk right now 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {atRisk.map((deal: any) => (
              <div
                key={deal.id}
                className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/dashboard/opportunities/${deal.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{deal.title || deal.name}</p>
                  <p className="text-xs text-muted-foreground">{deal.company_name || "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-sm font-medium">{formatCurrency(deal.value || 0)}</span>
                  <Badge variant="destructive" className="text-[10px]">
                    {Math.round(deal.confidence || 0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
