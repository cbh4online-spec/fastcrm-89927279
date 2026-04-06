import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Headphones, ChevronDown, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useState } from "react";

const statusColors: Record<string, string> = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  waiting_client: "bg-orange-500",
  waiting_internal: "bg-purple-500",
  on_hold: "bg-muted-foreground",
  resolved: "bg-green-500",
  closed: "bg-muted-foreground",
};

interface EntityTicketsSidebarProps {
  entityType: "contact" | "company";
  entityId: string;
}

export function EntityTicketsSidebar({ entityType, entityId }: EntityTicketsSidebarProps) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const { data: tickets = [] } = useQuery({
    queryKey: ["entity-tickets-sidebar", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const field = entityType === "contact" ? "contact_id" : "company_id";
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, status, priority, created_at")
        .eq("workspace_id", currentWorkspace.id)
        .eq(field, entityId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  const openCount = tickets.filter((t: any) => !["resolved", "closed"].includes(t.status)).length;

  if (tickets.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 rounded-md transition-colors">
        <div className="flex items-center gap-2">
          <Headphones className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Tickets</span>
          {openCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">
              {openCount}
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-2 space-y-1">
        {tickets.map((t: any) => (
          <button
            key={t.id}
            onClick={() => navigate(`/dashboard/helpdesk/tickets/${t.id}`)}
            className="w-full flex items-center gap-2 p-1.5 rounded text-left hover:bg-muted/50 transition-colors group"
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors[t.status] || "bg-muted-foreground"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{t.subject}</p>
              <p className="text-[10px] text-muted-foreground">
                #{t.ticket_number} · {formatDistanceToNow(new Date(t.created_at), { locale: pt, addSuffix: true })}
              </p>
            </div>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
        {tickets.length >= 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-6"
            onClick={() => navigate("/dashboard/helpdesk/tickets")}
          >
            Ver todos
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
