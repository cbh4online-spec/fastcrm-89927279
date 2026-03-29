import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Clock, CheckCircle2, XCircle, Pause, Play, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const STEP_LABELS = [
  "Valor & Conteúdo",
  "Prova Social",
  "Última Oportunidade",
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  paused: { label: "Pausado", variant: "outline" },
};

export function NurtureDashboard() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["nurture-queue", currentWorkspace?.id, filter],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("funnel_nurture_queue")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("funnel_nurture_queue")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurture-queue"] });
      toast.success("Estado atualizado com sucesso");
    },
    onError: () => toast.error("Erro ao atualizar estado"),
  });

  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    completed: items.filter((i) => i.status === "completed").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
    paused: items.filter((i) => i.status === "paused").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sequências de Nurture</h1>
        <p className="text-muted-foreground">
          Gerir leads na fila de nurture automático dos funis
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition" onClick={() => setFilter("all")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition" onClick={() => setFilter("pending")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition" onClick={() => setFilter("completed")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition" onClick={() => setFilter("cancelled")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition" onClick={() => setFilter("paused")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.paused}</p>
            <p className="text-xs text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">
            Fila de Nurture {filter !== "all" && <Badge variant="outline" className="ml-2">{statusConfig[filter]?.label}</Badge>}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["nurture-queue"] })}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">A carregar...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum lead na fila de nurture
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Funil</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Próximo Envio</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const cfg = statusConfig[item.status] || statusConfig.pending;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.recipient_email}</TableCell>
                        <TableCell className="text-sm">{item.recipient_name || "—"}</TableCell>
                        <TableCell className="text-sm">{item.funnel_name || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {item.current_step}/{STEP_LABELS.length}
                            </span>
                            {item.current_step < STEP_LABELS.length && (
                              <span className="text-xs text-muted-foreground">
                                ({STEP_LABELS[item.current_step]})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.status === "pending" && item.next_send_at ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {format(new Date(item.next_send_at), "d MMM, HH:mm", { locale: pt })}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.created_at), "d MMM yyyy", { locale: pt })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Pausar"
                                onClick={() => updateStatus.mutate({ id: item.id, status: "paused" })}
                              >
                                <Pause className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {item.status === "paused" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Retomar"
                                onClick={() => updateStatus.mutate({ id: item.id, status: "pending" })}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(item.status === "pending" || item.status === "paused") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Cancelar"
                                onClick={() => updateStatus.mutate({ id: item.id, status: "cancelled" })}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
