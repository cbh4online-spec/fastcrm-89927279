import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Search, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Users,
  Loader2
} from "lucide-react";
import { AllWorkspace, useAllWorkspaces } from "@/hooks/useAllWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function SaasManagementPanel() {
  const { workspaces, isLoading, refetch } = useAllWorkspaces();
  const [searchQuery, setSearchQuery] = useState("");
  const [syncingWorkspace, setSyncingWorkspace] = useState<string | null>(null);

  const filteredWorkspaces = (workspaces || []).filter((ws: AllWorkspace) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSyncStripe = async (workspaceId: string) => {
    setSyncingWorkspace(workspaceId);
    try {
      const { error } = await supabase.functions.invoke("check-subscription", {
        body: { workspace_id: workspaceId, force_sync: true }
      });
      
      if (error) throw error;
      
      toast.success("Subscrição sincronizada com sucesso");
      refetch();
    } catch (err) {
      toast.error("Erro ao sincronizar subscrição");
    } finally {
      setSyncingWorkspace(null);
    }
  };

  const handleToggleWorkspaceStatus = async (workspaceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ status: newStatus })
        .eq("id", workspaceId);
      
      if (error) throw error;
      
      toast.success(`Workspace ${newStatus === "active" ? "ativado" : "suspenso"}`);
      refetch();
    } catch (err) {
      toast.error("Erro ao alterar estado do workspace");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-emerald-500"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
      case "trial":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Pagamento Pendente</Badge>;
      case "canceled":
        return <Badge variant="outline"><Ban className="w-3 h-3 mr-1" />Cancelado</Badge>;
      case "suspended":
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Suspenso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "agency":
        return <Badge className="bg-purple-500">Agency</Badge>;
      case "pro":
        return <Badge className="bg-blue-500">Pro</Badge>;
      case "basic":
        return <Badge className="bg-gray-500">Basic</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    total: filteredWorkspaces.length,
    active: filteredWorkspaces.filter((ws: AllWorkspace) => ws.subscription?.status === "active").length,
    trial: filteredWorkspaces.filter((ws: AllWorkspace) => ws.status === "trial").length,
    pastDue: filteredWorkspaces.filter((ws: AllWorkspace) => ws.subscription?.status === "past_due").length,
    mrr: filteredWorkspaces.reduce((acc: number, ws: AllWorkspace) => {
      const plan = ws.subscription?.plan;
      if (plan === "agency") return acc + 299;
      if (plan === "pro") return acc + 99;
      if (plan === "basic") return acc + 29;
      return acc;
    }, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Workspaces</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              {stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Subscrições Ativas</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              {stats.active}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagamentos Pendentes</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              {stats.pastDue}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MRR Estimado</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              €{stats.mrr}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Workspaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>
            Lista de todos os workspaces com detalhes de subscrição e utilização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Utilização</TableHead>
                <TableHead>Próx. Cobrança</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkspaces.map((workspace: AllWorkspace) => (
                <TableRow key={workspace.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workspace.members_count || 1} utilizador(es)
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(workspace.subscription?.plan || "free")}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(workspace.subscription?.status || workspace.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{workspace.usage?.leads_count || 0} leads</p>
                      <p className="text-muted-foreground">
                        {workspace.usage?.ai_calls_used || 0} AI calls
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {workspace.subscription?.current_period_end ? (
                      <span className="text-sm">
                        {format(new Date(workspace.subscription.current_period_end), "dd MMM yyyy", { locale: pt })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncStripe(workspace.id)}
                        disabled={syncingWorkspace === workspace.id}
                      >
                        {syncingWorkspace === workspace.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleWorkspaceStatus(workspace.id, workspace.status)}
                      >
                        {workspace.status === "active" ? (
                          <Ban className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredWorkspaces.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum workspace encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
