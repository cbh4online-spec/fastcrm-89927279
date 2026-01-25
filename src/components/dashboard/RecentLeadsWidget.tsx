import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { useCompanies } from "@/hooks/useCompanies";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, ChevronRight } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/design-system";

interface RecentLeadsWidgetProps {
  maxItems?: number;
  isLoading?: boolean;
}

export function RecentLeadsWidget({ maxItems = 6, isLoading = false }: RecentLeadsWidgetProps) {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { companies } = useCompanies();
  const navigate = useNavigate();

  const loading = isLoading || leadsLoading;

  // Get recent leads sorted by created_at
  const recentLeads = leads
    ?.slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxItems) || [];

  const getCompanyName = (companyId?: string | null) => {
    if (!companyId) return null;
    const company = companies?.find((c: any) => c.id === companyId);
    return company?.name || null;
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Leads Recentes</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ListSkeleton count={5} showAvatar />
        </CardContent>
      </Card>
    );
  }

  if (recentLeads.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Leads Recentes</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <EmptyState
            type="leads"
            title="Sem leads recentes"
            description="Novos leads aparecerão aqui"
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Leads Recentes</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        {recentLeads.map((lead: any) => {
          const initials = lead.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "LD";
          const companyName = getCompanyName(lead.company_id) || lead.company;

          return (
            <div
              key={lead.id}
              onClick={() => navigate(`/dashboard/leads?selected=${lead.id}`)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-primary truncate">{lead.email}</p>
                  {companyName && (
                    <p className="text-xs text-muted-foreground truncate">· {companyName}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
