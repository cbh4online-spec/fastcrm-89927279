import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  workspace_id: string;
  workspaces?: { name: string };
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export function AlertsSection() {
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: incidents, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-incidents", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("system_incidents")
        .select(`
          *,
          workspaces (name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as unknown as Incident[];
    },
  });

  const { data: usageAlerts } = useQuery({
    queryKey: ["super-admin-usage-alerts"],
    queryFn: async () => {
      const result = await supabase
        .from("usage_alerts")
        .select("id, workspace_id, alert_type, resource_type, threshold_percent, current_usage, limit_value, message, created_at, is_dismissed")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  const resolveIncident = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("system_incidents")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq("id", id);

      if (error) throw error;

      // Log action
      await supabase.rpc("log_admin_action", {
        p_action_type: "incident_resolved",
        p_target_type: "system_incident",
        p_target_id: id,
        p_details: { notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-incidents"] });
      toast.success("Incidente resolvido");
      setSelectedIncident(null);
      setResolutionNotes("");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const dismissIncident = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("system_incidents")
        .update({ status: "dismissed" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-incidents"] });
      toast.success("Incidente dispensado");
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-destructive text-destructive-foreground">Crítico</Badge>;
      case "high":
        return <Badge className="bg-warning text-warning-foreground">Alto</Badge>;
      case "medium":
        return <Badge className="bg-info text-info-foreground">Médio</Badge>;
      case "low":
        return <Badge variant="outline">Baixo</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="border-warning text-warning">Aberto</Badge>;
      case "investigating":
        return <Badge className="bg-info text-info-foreground">A investigar</Badge>;
      case "resolved":
        return <Badge className="bg-success text-success-foreground">Resolvido</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dispensado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openCount = incidents?.filter((i) => i.status === "open").length || 0;
  const criticalCount = incidents?.filter((i) => i.severity === "critical" && i.status === "open").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas & Incidentes</h1>
          <p className="text-muted-foreground">
            Central de monitorização e resposta a incidentes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abertos</p>
                <p className="text-3xl font-bold">{openCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Uso</p>
                <p className="text-3xl font-bold">{usageAlerts?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolvidos (24h)</p>
                <p className="text-3xl font-bold text-success">
                  {incidents?.filter((i) => {
                    if (i.status !== "resolved" || !i.resolved_at) return false;
                    const resolved = new Date(i.resolved_at);
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return resolved > dayAgo;
                  }).length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="investigating">A investigar</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="dismissed">Dispensados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Incidentes</CardTitle>
          <CardDescription>
            Lista de incidentes do sistema ordenados por data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : incidents && incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(incident.severity)}
                        {getStatusBadge(incident.status)}
                      </div>
                      <p className="font-medium">{incident.title}</p>
                      {incident.workspaces?.name && (
                        <p className="text-sm text-muted-foreground">
                          Workspace: {incident.workspaces.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(incident.created_at), "dd MMM, HH:mm", { locale: pt })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {incident.status === "open" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissIncident.mutate(incident.id)}
                        >
                          Dispensar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedIncident(incident)}
                        >
                          Resolver
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Sem incidentes {statusFilter !== "all" ? "com este estado" : ""}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Detail / Resolve Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIncident && getSeverityBadge(selectedIncident.severity)}
              {selectedIncident?.title}
            </DialogTitle>
            <DialogDescription>
              Detalhes do incidente e resolução
            </DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p>{selectedIncident.description || "Sem descrição"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div className="mt-1">{getStatusBadge(selectedIncident.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedIncident.incident_type}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Workspace</p>
                <p className="font-medium">{selectedIncident.workspaces?.name || "-"}</p>
              </div>

              {selectedIncident.status === "open" && (
                <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-medium">Notas de resolução</label>
                  <Textarea
                    placeholder="Descreva como o problema foi resolvido..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {selectedIncident.status === "resolved" && selectedIncident.resolution_notes && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Notas de resolução</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedIncident.resolution_notes}
                  </p>
                  {selectedIncident.resolved_at && (
                    <p className="text-xs text-muted-foreground">
                      Resolvido em {format(new Date(selectedIncident.resolved_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIncident(null)}>
              Fechar
            </Button>
            {selectedIncident?.status === "open" && (
              <Button
                onClick={() => {
                  if (selectedIncident) {
                    resolveIncident.mutate({
                      id: selectedIncident.id,
                      notes: resolutionNotes,
                    });
                  }
                }}
              >
                Marcar como Resolvido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
