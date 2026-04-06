import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Star, Ticket, TrendingUp, MessageSquare, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TimeAgo from "react-timeago";
import { cn } from "@/lib/utils";

interface TicketClientHistoryProps {
  contactId: string | null;
  companyId: string | null;
  currentTicketId: string;
  workspaceId: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto", in_progress: "Em Progresso", waiting_client: "Aguarda",
  waiting_internal: "Interno", on_hold: "Espera", resolved: "Resolvido", closed: "Fechado",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

export function TicketClientHistory({ contactId, companyId, currentTicketId, workspaceId }: TicketClientHistoryProps) {
  const navigate = useNavigate();

  // Previous tickets from same contact or company
  const { data: previousTickets = [] } = useQuery({
    queryKey: ["client-ticket-history", contactId, companyId, currentTicketId],
    queryFn: async () => {
      const conditions: string[] = [];
      if (contactId) conditions.push(`contact_id.eq.${contactId}`);
      if (companyId) conditions.push(`company_id.eq.${companyId}`);
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, status, priority, satisfaction_rating, created_at, resolved_at")
        .eq("workspace_id", workspaceId)
        .neq("id", currentTicketId)
        .or(conditions.join(","))
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!(contactId || companyId),
  });

  // CRM activity logs for contact
  const { data: crmActivities = [] } = useQuery({
    queryKey: ["client-crm-activities", contactId, companyId],
    queryFn: async () => {
      const conditions: string[] = [];
      if (contactId) conditions.push(`record_id.eq.${contactId}`);
      if (companyId) conditions.push(`record_id.eq.${companyId}`);
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, table_name, changed_fields, created_at")
        .eq("workspace_id", workspaceId)
        .or(conditions.join(","))
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    enabled: !!(contactId || companyId),
  });

  // CSAT stats
  const csatStats = (() => {
    const rated = previousTickets.filter(t => t.satisfaction_rating != null);
    if (rated.length === 0) return null;
    const avg = rated.reduce((s, t) => s + (t.satisfaction_rating || 0), 0) / rated.length;
    const positive = rated.filter(t => (t.satisfaction_rating || 0) >= 4).length;
    return {
      avg: Math.round(avg * 10) / 10,
      total: rated.length,
      positivePercent: Math.round((positive / rated.length) * 100),
    };
  })();

  if (!contactId && !companyId) {
    return (
      <p className="text-[10px] text-muted-foreground italic">
        Associe um contacto ou empresa para ver o histórico
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* CSAT Summary */}
      {csatStats && (
        <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            Satisfação Histórica
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-lg">{csatStats.avg}</span>
            <div className="text-muted-foreground">
              <span>{csatStats.total} avaliações</span>
              <span className="mx-1">•</span>
              <span className={cn(
                csatStats.positivePercent >= 80 ? "text-green-600" : csatStats.positivePercent >= 50 ? "text-amber-600" : "text-red-600"
              )}>
                {csatStats.positivePercent}% positivas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Previous Tickets */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
          <Ticket className="h-3 w-3" />
          Tickets Anteriores ({previousTickets.length})
        </div>
        {previousTickets.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">Primeiro ticket deste cliente</p>
        ) : (
          <div className="space-y-1">
            {previousTickets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => navigate(`/dashboard/helpdesk/tickets/${t.id}`)}
              >
                <span className="text-[10px] font-mono text-muted-foreground w-8 shrink-0">
                  #{t.ticket_number}
                </span>
                <span className="text-[11px] truncate flex-1 min-w-0">{t.subject}</span>
                <Badge className={`text-[8px] px-1 py-0 shrink-0 ${STATUS_COLORS[t.status] || "bg-muted text-muted-foreground"}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </Badge>
                {t.satisfaction_rating && (
                  <span className="text-[9px] text-amber-500 shrink-0 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-current" /> {t.satisfaction_rating}
                  </span>
                )}
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
              </div>
            ))}
            {previousTickets.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                +{previousTickets.length - 5} tickets anteriores
              </p>
            )}
          </div>
        )}
      </div>

      {/* CRM Activity */}
      {crmActivities.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
            <TrendingUp className="h-3 w-3" />
            Atividade CRM Recente
          </div>
          <div className="space-y-1">
            {crmActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[10px] text-muted-foreground py-1">
                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                <span className="capitalize">{a.action}</span>
                <span className="text-muted-foreground/60">em {a.table_name}</span>
                <span className="ml-auto shrink-0"><TimeAgo date={a.created_at} /></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
