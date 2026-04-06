import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { useHelpdeskTickets } from "@/hooks/useHelpdeskTickets";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTicketDialog } from "./CreateTicketDialog";
import { Headphones, Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  on_hold: "Em Espera",
  resolved: "Resolvido",
  closed: "Fechado",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  waiting_client: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  waiting_internal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  on_hold: "bg-muted text-muted-foreground",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface EntityTicketsSectionProps {
  entityType: "contact" | "company";
  entityId: string;
  entityName?: string;
}

export function EntityTicketsSection({ entityType, entityId, entityName }: EntityTicketsSectionProps) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { createTicket } = useHelpdeskTickets();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["entity-tickets", entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const field = entityType === "contact" ? "contact_id" : "company_id";
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq(field, entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id && !!entityId,
  });

  const openCount = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Tickets de Suporte</h3>
          {openCount > 0 && (
            <Badge variant="secondary" className="text-xs">{openCount} aberto{openCount !== 1 ? "s" : ""}</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Novo Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Headphones className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sem tickets de suporte</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t: any) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/helpdesk/tickets/${t.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.ticket_number}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {t.subject}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[t.status] || "bg-muted"}>
                        {statusLabels[t.status] || t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[t.priority] || "bg-muted"} variant="outline">
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd/MM/yyyy", { locale: pt })}
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateTicketDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultValues={{
          ...(entityType === "contact" ? { contact_id: entityId } : { company_id: entityId }),
        }}
      />
    </div>
  );
}
