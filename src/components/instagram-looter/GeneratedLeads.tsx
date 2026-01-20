import { useQuery } from "@tanstack/react-query";
import { UserPlus, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Link } from "react-router-dom";

export function GeneratedLeads() {
  const { currentWorkspace } = useWorkspace();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["ig-generated-leads", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("ig_generated_leads")
        .select(`
          *,
          profile:ig_profiles(*),
          insight:ig_ai_profile_insights(*),
          crm_lead:leads(id, name, status)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">A carregar leads...</div>
        </CardContent>
      </Card>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem Leads Gerados</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Quando analisar perfis e criar leads, eles aparecerão aqui.
            Use a busca global para encontrar perfis e criar leads.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Leads Gerados ({leads.length})</h3>
      </div>

      <div className="space-y-4">
        {leads.map((lead: any) => (
          <Card key={lead.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <img
                  src={lead.profile?.profile_pic_url || "/placeholder.svg"}
                  alt={lead.profile?.username}
                  className="h-14 w-14 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">
                        @{lead.profile?.username}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {lead.profile?.full_name || "—"}
                      </p>
                    </div>
                    {lead.insight?.lead_score && (
                      <Badge 
                        variant={lead.insight.lead_score >= 70 ? "default" : "secondary"}
                        className="text-lg px-3 py-1"
                      >
                        {lead.insight.lead_score}/100
                      </Badge>
                    )}
                  </div>

                  {lead.insight && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lead.insight.category_guess && (
                        <Badge variant="outline">
                          {lead.insight.category_guess}
                        </Badge>
                      )}
                      {lead.insight.specialty_guess && (
                        <Badge variant="outline">
                          {lead.insight.specialty_guess}
                        </Badge>
                      )}
                      {lead.insight.city_guess && (
                        <Badge variant="outline">
                          📍 {lead.insight.city_guess}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {lead.crm_lead?.id ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/dashboard/leads/${lead.crm_lead.id}`}>
                          Ver Lead no CRM
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Pendente sincronização</Badge>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`https://instagram.com/${lead.profile?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver no Instagram
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
