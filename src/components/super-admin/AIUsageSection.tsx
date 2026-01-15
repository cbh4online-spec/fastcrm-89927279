import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Brain,
  Search,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Gauge,
  Ban,
} from "lucide-react";

interface WorkspaceAIUsage {
  id: string;
  name: string;
  plan: string;
  ai_calls_used: number;
  ai_limit: number;
  percentage: number;
  is_abuse: boolean;
}

export function AIUsageSection() {
  const [search, setSearch] = useState("");
  const [limitDialog, setLimitDialog] = useState<WorkspaceAIUsage | null>(null);
  const queryClient = useQueryClient();

  const { data: usageData, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-ai-usage"],
    queryFn: async () => {
      // Fetch workspaces with usage and plan features
      const { data: workspaces, error } = await supabase
        .from("workspaces")
        .select(`
          id,
          name,
          workspace_subscriptions (plan),
          workspace_usage (ai_calls_used)
        `);

      if (error) throw error;

      // Fetch plan limits
      const { data: planFeatures } = await supabase
        .from("plan_features")
        .select("plan_id, ai_calls_limit");

      const limits: Record<string, number> = {};
      planFeatures?.forEach((pf: any) => {
        limits[pf.plan_id] = pf.ai_calls_limit || 100;
      });

      // Calculate usage stats
      const result: WorkspaceAIUsage[] = (workspaces || []).map((ws: any) => {
        const plan = ws.workspace_subscriptions?.[0]?.plan || "free";
        const used = ws.workspace_usage?.[0]?.ai_calls_used || 0;
        const limit = limits[plan] || 100;
        const percentage = Math.min(100, (used / limit) * 100);
        
        return {
          id: ws.id,
          name: ws.name,
          plan,
          ai_calls_used: used,
          ai_limit: limit,
          percentage,
          is_abuse: percentage > 150 || used > limit * 2,
        };
      });

      // Sort by usage percentage descending
      return result.sort((a, b) => b.percentage - a.percentage);
    },
  });

  const limitAI = useMutation({
    mutationFn: async (workspaceId: string) => {
      // Create an override to limit AI
      const { error } = await supabase
        .from("workspace_overrides")
        .insert({
          workspace_id: workspaceId,
          override_type: "ai_limit_reduced",
          override_value: { new_limit: 10 },
          reason: "Uso excessivo de IA detectado",
          created_by: (await supabase.auth.getUser()).data.user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (error) throw error;

      // Log action
      await supabase.rpc("log_admin_action", {
        p_action_type: "ai_limit_applied",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: workspaceId,
        p_details: { reason: "abuse_detected" },
      });

      // Create incident
      await supabase
        .from("system_incidents")
        .insert({
          incident_type: "ai_abuse",
          severity: "medium",
          title: "Limite de IA aplicado por uso excessivo",
          workspace_id: workspaceId,
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: "Limite temporário aplicado automaticamente",
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-ai-usage"] });
      toast.success("Limite de IA aplicado");
      setLimitDialog(null);
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const totalUsage = usageData?.reduce((acc, ws) => acc + ws.ai_calls_used, 0) || 0;
  const avgUsage = usageData?.length ? Math.round(totalUsage / usageData.length) : 0;
  const abuseCount = usageData?.filter((ws) => ws.is_abuse).length || 0;
  const nearLimitCount = usageData?.filter((ws) => ws.percentage >= 80 && ws.percentage < 100).length || 0;

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "agency": return <Badge className="bg-primary text-primary-foreground">Agency</Badge>;
      case "pro": return <Badge className="bg-info text-info-foreground">Pro</Badge>;
      case "basic": return <Badge variant="secondary">Basic</Badge>;
      default: return <Badge variant="outline">Free</Badge>;
    }
  };

  const getUsageStatus = (percentage: number, isAbuse: boolean) => {
    if (isAbuse) {
      return <Badge className="bg-destructive text-destructive-foreground">Abuso</Badge>;
    }
    if (percentage >= 100) {
      return <Badge className="bg-destructive text-destructive-foreground">Excedido</Badge>;
    }
    if (percentage >= 90) {
      return <Badge className="bg-warning text-warning-foreground">Crítico</Badge>;
    }
    if (percentage >= 80) {
      return <Badge variant="outline" className="border-warning text-warning">Alto</Badge>;
    }
    return <Badge variant="outline" className="border-success text-success">Normal</Badge>;
  };

  const filteredData = usageData?.filter((ws) =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Uso de IA</h1>
          <p className="text-muted-foreground">
            Monitorização de uso de IA para garantir estabilidade do sistema
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
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-3xl font-bold">{totalUsage.toLocaleString()}</p>
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média/Workspace</p>
                <p className="text-3xl font-bold">{avgUsage}</p>
              </div>
              <Gauge className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Perto do Limite</p>
                <p className="text-3xl font-bold text-warning">{nearLimitCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uso Abusivo</p>
                <p className="text-3xl font-bold text-destructive">{abuseCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abuse Alert */}
      {abuseCount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Detetado Uso Abusivo ({abuseCount})
            </CardTitle>
            <CardDescription>
              Workspaces com uso anormalmente elevado de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usageData?.filter((ws) => ws.is_abuse).slice(0, 3).map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{ws.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ws.ai_calls_used.toLocaleString()} / {ws.ai_limit.toLocaleString()} calls ({Math.round(ws.percentage)}%)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setLimitDialog(ws)}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Limitar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar workspaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData?.map((ws) => (
                  <TableRow key={ws.id}>
                    <TableCell className="font-medium">{ws.name}</TableCell>
                    <TableCell>{getPlanBadge(ws.plan)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {ws.ai_calls_used.toLocaleString()} / {ws.ai_limit.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-32">
                        <Progress
                          value={Math.min(100, ws.percentage)}
                          className={`h-2 ${
                            ws.percentage >= 100
                              ? "[&>div]:bg-destructive"
                              : ws.percentage >= 80
                              ? "[&>div]:bg-warning"
                              : "[&>div]:bg-success"
                          }`}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(ws.percentage)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getUsageStatus(ws.percentage, ws.is_abuse)}</TableCell>
                    <TableCell>
                      {(ws.is_abuse || ws.percentage >= 100) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLimitDialog(ws)}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Limit Dialog */}
      <Dialog open={!!limitDialog} onOpenChange={() => setLimitDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Limitar Uso de IA
            </DialogTitle>
            <DialogDescription>
              Tens a certeza que queres aplicar um limite temporário de IA ao workspace "{limitDialog?.name}"?
              <br /><br />
              O limite será reduzido para 10 calls por 7 dias.
              Esta ação será registada nos logs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Uso atual</p>
              <p className="text-2xl font-bold">
                {limitDialog?.ai_calls_used.toLocaleString()} / {limitDialog?.ai_limit.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                ({Math.round(limitDialog?.percentage || 0)}% do limite)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => limitDialog && limitAI.mutate(limitDialog.id)}
            >
              Aplicar Limite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
