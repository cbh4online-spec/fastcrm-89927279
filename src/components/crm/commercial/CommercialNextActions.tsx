import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, ArrowRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";

interface CommercialNextActionsProps {
  entityType: "contact" | "company";
  entityId: string;
}

export function CommercialNextActions({ entityType, entityId }: CommercialNextActionsProps) {
  const { t } = useTranslation('crm');
  const { currentWorkspace } = useWorkspace();

  const { data: openOpps } = useQuery({
    queryKey: ["commercial-next-actions", entityType, entityId, currentWorkspace?.id],
    queryFn: async () => {
      if (!entityId || !currentWorkspace) return [];
      const col = entityType === "contact" ? "contact_id" : "company_id";
      const { data } = await supabase
        .from("opportunities")
        .select("id, title, ai_next_action, expected_close_date, updated_at")
        .eq(col, entityId)
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open")
        .order("expected_close_date", { ascending: true, nullsFirst: false })
        .limit(5);
      return data || [];
    },
    enabled: !!entityId && !!currentWorkspace,
  });

  const actionsWithNext = openOpps?.filter((o) => o.ai_next_action) || [];

  if (actionsWithNext.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="w-4 h-4" />
          {t('nextActions', 'Próximas Ações')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionsWithNext.map((opp) => (
          <div key={opp.id} className="flex items-start gap-2 text-xs">
            <ArrowRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-medium">{opp.title}</span>
              <p className="text-muted-foreground truncate">{opp.ai_next_action}</p>
              {opp.expected_close_date && (
                <span className="text-[10px] text-muted-foreground">
                  {t('expectedClose', 'Fecho previsto')}: {new Date(opp.expected_close_date).toLocaleDateString('pt-PT')}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
