import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { useNavigate } from "react-router-dom";
import { ChevronRight, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

const temperatureConfig: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  hot: { label: "Quente", color: "bg-red-500/10 text-red-600 border-red-200", icon: TrendingUp },
  warm: { label: "Morno", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Minus },
  cold: { label: "Frio", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: TrendingDown },
};

interface LeadManagementTableProps {
  maxItems?: number;
  isLoading?: boolean;
}

export function LeadManagementTable({ maxItems = 5, isLoading = false }: LeadManagementTableProps) {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const navigate = useNavigate();

  const loading = isLoading || leadsLoading;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value}`;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Gestão de Leads</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs gap-1 text-primary hover:text-primary"
              onClick={() => navigate("/dashboard/leads")}
            >
              Ver todos
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Sem leads registados</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Os leads aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Gestão de Leads</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs gap-1 text-primary hover:text-primary"
            onClick={() => navigate("/dashboard/leads")}
          >
            Ver todos
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
            <div className="col-span-4">Lead</div>
            <div className="col-span-3">Empresa</div>
            <div className="col-span-2 text-right">Budget</div>
            <div className="col-span-1 text-center">Score</div>
            <div className="col-span-2 text-center">Status</div>
          </div>

          {/* Rows */}
          {leads.slice(0, maxItems).map((lead: any) => {
            const temp = temperatureConfig[lead.temperature || "warm"] || temperatureConfig.warm;
            const TempIcon = temp.icon;
            const initials = lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || "LD";

            return (
              <div 
                key={lead.id}
                onClick={() => navigate(`/dashboard/leads?selected=${lead.id}`)}
                className="grid grid-cols-12 gap-2 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer items-center"
              >
                {/* Lead Name */}
                <div className="col-span-4 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{lead.name}</span>
                </div>

                {/* Company */}
                <div className="col-span-3 text-sm text-muted-foreground truncate">
                  {lead.company || "—"}
                </div>

                {/* Budget */}
                <div className="col-span-2 text-right">
                  <span className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(lead.estimated_value || 0)}
                  </span>
                </div>

                {/* Score */}
                <div className="col-span-1 text-center">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      (lead.lead_score || 0) >= 80 
                        ? "bg-emerald-500/10 text-emerald-600" 
                        : (lead.lead_score || 0) >= 50 
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {lead.lead_score || 0}
                  </Badge>
                </div>

                {/* Temperature Status */}
                <div className="col-span-2 flex justify-center">
                  <Badge variant="outline" className={`text-xs gap-1 ${temp.color}`}>
                    <TempIcon className="w-3 h-3" />
                    {temp.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
