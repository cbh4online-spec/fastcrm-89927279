import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  FileText,
  User,
  Building2,
  Settings,
  CreditCard,
  Lock,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface AuditLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  workspace_id: string | null;
  details: Record<string, any>;
  created_at: string;
  workspaces?: { name: string } | null;
  admin_profile?: { full_name: string | null; email: string | null } | null;
}

export function LogsSection() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-audit-logs", actionFilter],
    queryFn: async () => {
      // First fetch logs
      let query = supabase
        .from("admin_audit_logs")
        .select(`
          *,
          workspaces (name)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") {
        query = query.ilike("action_type", `%${actionFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch admin profiles for display names
      const adminIds = [...new Set((data || []).map((l: any) => l.admin_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", adminIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map((log: any) => ({
        ...log,
        admin_profile: profileMap.get(log.admin_user_id) || null,
      })) as AuditLog[];
    },
  });

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("workspace")) {
      return <Building2 className="h-4 w-4" />;
    }
    if (actionType.includes("user") || actionType.includes("impersonate")) {
      return <User className="h-4 w-4" />;
    }
    if (actionType.includes("payment") || actionType.includes("subscription") || actionType.includes("billing")) {
      return <CreditCard className="h-4 w-4" />;
    }
    if (actionType.includes("block") || actionType.includes("suspend")) {
      return <Lock className="h-4 w-4" />;
    }
    if (actionType.includes("setting") || actionType.includes("config")) {
      return <Settings className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getActionBadge = (actionType: string) => {
    if (actionType.includes("suspend") || actionType.includes("block")) {
      return <Badge className="bg-destructive text-destructive-foreground">{actionType}</Badge>;
    }
    if (actionType.includes("reactivate") || actionType.includes("resolved")) {
      return <Badge className="bg-success text-success-foreground">{actionType}</Badge>;
    }
    if (actionType.includes("payment") || actionType.includes("billing")) {
      return <Badge className="bg-warning text-warning-foreground">{actionType}</Badge>;
    }
    return <Badge variant="outline">{actionType}</Badge>;
  };

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = 
      log.action_type.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type.toLowerCase().includes(search.toLowerCase()) ||
      log.workspaces?.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Registo de todas as ações administrativas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por ação, target ou workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="workspace">Workspaces</SelectItem>
                <SelectItem value="user">Utilizadores</SelectItem>
                <SelectItem value="member">Membros</SelectItem>
                <SelectItem value="permission">Permissões</SelectItem>
                <SelectItem value="moderation">Moderação</SelectItem>
                <SelectItem value="subscription">Subscrições</SelectItem>
                <SelectItem value="payment">Pagamentos</SelectItem>
                <SelectItem value="incident">Incidentes</SelectItem>
                <SelectItem value="suspend">Suspensões</SelectItem>
                <SelectItem value="override">Overrides</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="p-2 bg-muted rounded-md">
                        {getActionIcon(log.action_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action_type)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.admin_profile?.full_name || log.admin_profile?.email || log.admin_user_id.slice(0, 8) + "..."}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.target_type}</p>
                        {log.target_id && (
                          <code className="text-xs text-muted-foreground">
                            {log.target_id.slice(0, 8)}...
                          </code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.workspaces?.name || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredLogs?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Informação completa da ação administrativa
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ação</p>
                  <div className="mt-1">{getActionBadge(selectedLog.action_type)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Type</p>
                  <p className="font-medium">{selectedLog.target_type}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Target ID</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {selectedLog.target_id || "-"}
                </code>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Workspace</p>
                <p className="font-medium">{selectedLog.workspaces?.name || "-"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Admin</p>
                <p className="font-medium">
                  {selectedLog.admin_profile?.full_name || selectedLog.admin_profile?.email || selectedLog.admin_user_id}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                </p>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Detalhes</p>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
