import { useState } from "react";
import { useActivityLogs, ActivityLogFilters } from "@/hooks/useActivityLogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Eye, Activity, Filter } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const MODULES = [
  "CRM - Leads", "CRM - Contactos", "CRM - Empresas", "CRM - Oportunidades",
  "Produtividade - Tarefas", "Agenda", "Inbox", "Produtos", "Facturação",
  "Notas de Encomenda", "Propostas", "Marketing - Email", "Automações",
  "Workflows", "Bio Pages", "Loja Online", "Marketplace C2C", "Comunidade",
  "IA - Motor Conversacional", "IA - Agentes", "Document Intelligence",
  "Funis", "Subscrições", "Workspace Config", "Configuração",
];

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  UPDATE: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-700 border-red-500/30",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Edição",
  DELETE: "Eliminação",
};

export function ActivityLogsSection() {
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [detailLog, setDetailLog] = useState<any>(null);
  const { data, isLoading, page, setPage, totalPages } = useActivityLogs(filters);

  const updateFilter = (key: keyof ActivityLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Activity Logs
        </h1>
        <p className="text-muted-foreground">
          Registo automático de todas as acções de todos os utilizadores em todos os módulos.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={filters.module || ""} onValueChange={(v) => updateFilter("module", v)}>
              <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.action || ""} onValueChange={(v) => updateFilter("action", v)}>
              <SelectTrigger><SelectValue placeholder="Acção" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Edição</SelectItem>
                <SelectItem value="DELETE">Eliminação</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Data início"
              value={filters.dateFrom || ""}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />

            <Input
              type="date"
              placeholder="Data fim"
              value={filters.dateTo || ""}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>
          <div className="mt-3">
            <Input
              placeholder="Pesquisar por ID de registo ou tabela..."
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Acção</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Campos Alterados</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Sem registos de actividade.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.profile?.full_name || log.profile?.email || log.user_id?.slice(0, 8) || "Sistema"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {log.module || log.table_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[log.action] || ""} variant="outline">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.table_name}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {log.changed_fields?.join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  {data?.total || 0} registos
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page + 1} / {Math.max(totalPages, 1)}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da Acção</DialogTitle>
            <DialogDescription>
              {detailLog && (
                <span>
                  {ACTION_LABELS[detailLog.action]} em <strong>{detailLog.table_name}</strong> por{" "}
                  {detailLog.profile?.full_name || detailLog.user_id?.slice(0, 8) || "Sistema"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Record ID</span>
                  <p className="font-mono text-xs">{detailLog.record_id || "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Workspace ID</span>
                  <p className="font-mono text-xs">{detailLog.workspace_id || "—"}</p>
                </div>
              </div>

              {detailLog.changed_fields?.length > 0 && (
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Campos Alterados</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailLog.changed_fields.map((f: string) => (
                      <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detailLog.old_data && (
                  <div>
                    <span className="font-medium text-sm text-destructive">Dados Anteriores</span>
                    <pre className="mt-1 p-3 bg-destructive/5 rounded-md text-xs overflow-auto max-h-64 border">
                      {JSON.stringify(detailLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {detailLog.new_data && (
                  <div>
                    <span className="font-medium text-sm text-primary">Dados Novos</span>
                    <pre className="mt-1 p-3 bg-primary/5 rounded-md text-xs overflow-auto max-h-64 border">
                      {JSON.stringify(detailLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
