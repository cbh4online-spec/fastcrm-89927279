import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Eye, AlertTriangle, CheckCircle2, XCircle, Zap, Shield } from "lucide-react";

interface MatrixEntry {
  id: string;
  event_name: string;
  domain: string;
  source_module: string;
  entity_type: string;
  minimum_payload_json: Record<string, unknown>;
  signal_type: string | null;
  decision_type: string | null;
  action_type: string | null;
  priority: string;
  is_user_visible: boolean;
  auto_execute: boolean;
  target_module: string | null;
  notes: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
}

interface RuntimeFailure {
  id: string;
  event_name: string;
  failure_stage: string;
  error_message: string;
  created_at: string;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "destructive", label: "Critical" },
  high: { color: "default", label: "High" },
  medium: { color: "secondary", label: "Medium" },
  low: { color: "outline", label: "Low" },
};

export default function EventMatrixPage() {
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<MatrixEntry | null>(null);
  const [filterDomain, setFilterDomain] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["event-decision-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_decision_matrix")
        .select("*")
        .order("domain")
        .order("event_name");
      if (error) throw error;
      return (data ?? []) as MatrixEntry[];
    },
  });

  const { data: failures = [] } = useQuery({
    queryKey: ["event-runtime-failures-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_runtime_failures")
        .select("id, event_name, failure_stage, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RuntimeFailure[];
    },
  });

  const domains = [...new Set(entries.map((e) => e.domain))];

  const filtered = entries.filter((e) => {
    const matchesSearch =
      !search ||
      e.event_name.toLowerCase().includes(search.toLowerCase()) ||
      e.source_module.toLowerCase().includes(search.toLowerCase()) ||
      (e.signal_type?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesDomain = !filterDomain || e.domain === filterDomain;
    return matchesSearch && matchesDomain;
  });

  const stats = {
    total: entries.length,
    critical: entries.filter((e) => e.priority === "critical").length,
    autoExecute: entries.filter((e) => e.auto_execute).length,
    active: entries.filter((e) => e.is_active).length,
    recentFailures: failures.length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Decision Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governação de eventos, sinais, decisões e ações do Kernel
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Eventos Registados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.autoExecute}</p>
              <p className="text-xs text-muted-foreground">Auto-Execute</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.recentFailures}</p>
              <p className="text-xs text-muted-foreground">Falhas Recentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar evento, módulo ou sinal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={filterDomain === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterDomain(null)}
            >
              Todos
            </Button>
            {domains.map((d) => (
              <Button
                key={d}
                variant={filterDomain === d ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterDomain(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Sinal</TableHead>
                    <TableHead>Decisão</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="text-center">Auto</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Schema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        A carregar...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum evento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((entry) => {
                      const prio = priorityConfig[entry.priority] ?? priorityConfig.low;
                      const hasFailures = failures.some((f) => f.event_name === entry.event_name);
                      return (
                        <TableRow key={entry.id} className={hasFailures ? "bg-destructive/5" : ""}>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">
                            {entry.event_name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.source_module}
                          </TableCell>
                          <TableCell>
                            {entry.signal_type ? (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                {entry.signal_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{entry.decision_type ?? "—"}</TableCell>
                          <TableCell className="text-xs">{entry.action_type ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={prio.color as "destructive" | "default" | "secondary" | "outline"}>
                              {prio.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.auto_execute ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.is_active ? (
                              <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Failures */}
        {failures.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Falhas Recentes de Runtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {failures.slice(0, 10).map((f) => (
                  <div key={f.id} className="flex items-start gap-3 text-xs border-b pb-2">
                    <Badge variant="outline" className="shrink-0 text-destructive border-destructive/30">
                      {f.failure_stage}
                    </Badge>
                    <span className="font-mono text-muted-foreground">{f.event_name}</span>
                    <span className="text-muted-foreground truncate flex-1">{f.error_message}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(f.created_at).toLocaleTimeString("pt-PT")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payload Schema Dialog */}
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {selectedEntry?.event_name}
              </DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Domínio:</span>{" "}
                    <span className="font-medium">{selectedEntry.domain}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entidade:</span>{" "}
                    <span className="font-medium">{selectedEntry.entity_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target:</span>{" "}
                    <span className="font-medium">{selectedEntry.target_module ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versão:</span>{" "}
                    <span className="font-medium">v{selectedEntry.version}</span>
                  </div>
                </div>

                {selectedEntry.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notas:</span>{" "}
                    <span>{selectedEntry.notes}</span>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Pipeline</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{selectedEntry.signal_type ?? "—"}</Badge>
                    <span>→</span>
                    <Badge variant="outline">{selectedEntry.decision_type ?? "—"}</Badge>
                    <span>→</span>
                    <Badge variant="outline">{selectedEntry.action_type ?? "—"}</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Payload Schema</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[300px] font-mono">
                    {JSON.stringify(selectedEntry.minimum_payload_json, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
