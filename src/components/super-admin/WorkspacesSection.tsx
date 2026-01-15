import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  RefreshCw, 
  Lock, 
  Unlock,
  ArrowUpCircle,
  AlertTriangle,
  Building2,
  Filter,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  status: string;
  owner_id: string;
  created_at: string;
  managed_by_workspace_id?: string | null;
  managed_by_workspace?: {
    id: string;
    name: string;
  } | null;
  subscription?: {
    plan: string;
    status: string;
    current_period_end: string;
    stripe_customer_id: string;
  };
  usage?: {
    leads_count: number;
    contacts_count: number;
    companies_count: number;
    ai_calls_used: number;
    emails_sent: number;
  };
  members_count: number;
  billing?: {
    company_name?: string;
    tax_id?: string;
    billing_email?: string;
    billing_address?: string;
    billing_city?: string;
    billing_postal_code?: string;
    billing_country?: string;
  };
}

export function WorkspacesSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceDetails | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "suspend" | "reactivate" | "change-plan" | "assign-agency" | null;
    workspace: WorkspaceDetails | null;
  }>({ type: null, workspace: null });
  const [newPlan, setNewPlan] = useState<string>("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-workspaces"],
    queryFn: async () => {
      const { data: workspacesData, error } = await supabase
        .from("workspaces")
        .select(`
          id, 
          name, 
          slug, 
          status,
          owner_id,
          created_at,
          managed_by_workspace_id,
          company_name,
          tax_id,
          billing_email,
          billing_address,
          billing_city,
          billing_postal_code,
          billing_country,
          workspace_subscriptions (
            plan,
            status,
            current_period_end,
            stripe_customer_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Build a map of workspace id -> workspace name for agency lookup
      const workspaceNameMap = new Map(
        (workspacesData || []).map((ws: any) => [ws.id, ws.name])
      );

      // Get member counts
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("workspace_id");

      const memberCounts = membersData?.reduce((acc: Record<string, number>, m: any) => {
        acc[m.workspace_id] = (acc[m.workspace_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get leads counts per workspace
      const { data: leadsData } = await supabase
        .from("leads")
        .select("workspace_id");

      const leadsCounts = leadsData?.reduce((acc: Record<string, number>, l: any) => {
        acc[l.workspace_id] = (acc[l.workspace_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get contacts counts per workspace
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("workspace_id");

      const contactsCounts = contactsData?.reduce((acc: Record<string, number>, c: any) => {
        acc[c.workspace_id] = (acc[c.workspace_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get companies counts per workspace
      const { data: companiesData } = await supabase
        .from("companies")
        .select("workspace_id");

      const companiesCounts = companiesData?.reduce((acc: Record<string, number>, c: any) => {
        acc[c.workspace_id] = (acc[c.workspace_id] || 0) + 1;
        return acc;
      }, {}) || {};

      return (workspacesData || []).map((ws: any) => {
        // Handle subscription - can be array or object depending on query result
        const subscription = Array.isArray(ws.workspace_subscriptions) 
          ? ws.workspace_subscriptions[0] 
          : ws.workspace_subscriptions;
        
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          status: ws.status || "active",
          owner_id: ws.owner_id,
          created_at: ws.created_at,
          managed_by_workspace_id: ws.managed_by_workspace_id,
          managed_by_workspace: ws.managed_by_workspace_id 
            ? { id: ws.managed_by_workspace_id, name: workspaceNameMap.get(ws.managed_by_workspace_id) || "Agência" }
            : null,
          subscription: subscription || undefined,
          usage: {
            leads_count: leadsCounts[ws.id] || 0,
            contacts_count: contactsCounts[ws.id] || 0,
            companies_count: companiesCounts[ws.id] || 0,
            ai_calls_used: 0,
            emails_sent: 0,
          },
          members_count: memberCounts[ws.id] || 1,
          billing: {
            company_name: ws.company_name,
            tax_id: ws.tax_id,
            billing_email: ws.billing_email,
            billing_address: ws.billing_address,
            billing_city: ws.billing_city,
            billing_postal_code: ws.billing_postal_code,
            billing_country: ws.billing_country,
          },
        };
      }) as WorkspaceDetails[];
    },
  });

  // Get agency workspaces (those with agency plan)
  const agencyWorkspaces = workspaces?.filter(
    ws => ws.subscription?.plan === "agency"
  ) || [];

  const updateWorkspaceStatus = useMutation({
    mutationFn: async ({ workspaceId, status }: { workspaceId: string; status: string }) => {
      const { error } = await supabase
        .from("workspaces")
        .update({ status })
        .eq("id", workspaceId);
      
      if (error) throw error;

      // Log the action
      await supabase.rpc("log_admin_action", {
        p_action_type: status === "suspended" ? "workspace_suspended" : "workspace_reactivated",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: workspaceId,
        p_details: { new_status: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success("Estado do workspace atualizado");
      setActionDialog({ type: null, workspace: null });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar workspace: " + error.message);
    },
  });

  const syncStripe = useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase.functions.invoke("check-subscription", {
        body: { workspace_id: workspaceId, force_sync: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success("Sincronização Stripe concluída");
    },
    onError: (error) => {
      toast.error("Erro na sincronização: " + error.message);
    },
  });

  const changePlan = useMutation({
    mutationFn: async ({ workspaceId, plan }: { workspaceId: string; plan: "free" | "basic" | "pro" | "agency" }) => {
      // Update workspace_subscriptions table
      const { data: existingSub } = await supabase
        .from("workspace_subscriptions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existingSub) {
        const { error } = await supabase
          .from("workspace_subscriptions")
          .update({ plan, updated_at: new Date().toISOString() })
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_subscriptions")
          .insert([{ 
            workspace_id: workspaceId, 
            plan, 
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }]);
        if (error) throw error;
      }

      // Log the action
      await supabase.rpc("log_admin_action", {
        p_action_type: "plan_changed",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: workspaceId,
        p_details: { new_plan: plan },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success("Plano alterado com sucesso");
      setActionDialog({ type: null, workspace: null });
      setNewPlan("");
    },
    onError: (error) => {
      toast.error("Erro ao alterar plano: " + error.message);
    },
  });

  const assignAgency = useMutation({
    mutationFn: async ({ workspaceId, agencyId }: { workspaceId: string; agencyId: string | null }) => {
      const { error } = await supabase
        .from("workspaces")
        .update({ managed_by_workspace_id: agencyId })
        .eq("id", workspaceId);
      
      if (error) throw error;

      // Log the action
      await supabase.rpc("log_admin_action", {
        p_action_type: agencyId ? "agency_assigned" : "agency_removed",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: workspaceId,
        p_details: { agency_workspace_id: agencyId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success("Agência atribuída com sucesso");
      setActionDialog({ type: null, workspace: null });
      setSelectedAgencyId("");
    },
    onError: (error) => {
      toast.error("Erro ao atribuir agência: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case "trialing":
        return <Badge className="bg-info text-info-foreground">Trial</Badge>;
      case "past_due":
        return <Badge className="bg-warning text-warning-foreground">Past Due</Badge>;
      case "canceled":
        return <Badge className="bg-destructive text-destructive-foreground">Cancelado</Badge>;
      case "suspended":
        return <Badge variant="outline" className="border-destructive text-destructive">Suspenso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan?: string) => {
    if (!plan) return <Badge variant="outline">Free</Badge>;
    switch (plan) {
      case "agency":
        return <Badge className="bg-primary text-primary-foreground">Agency</Badge>;
      case "pro":
        return <Badge className="bg-info text-info-foreground">Pro</Badge>;
      case "basic":
        return <Badge variant="secondary">Basic</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const filteredWorkspaces = workspaces?.filter((ws) => {
    const matchesSearch = ws.name.toLowerCase().includes(search.toLowerCase()) ||
      ws.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      ws.subscription?.status === statusFilter || 
      ws.status === statusFilter;
    const matchesPlan = planFilter === "all" || 
      (ws.subscription?.plan || "free") === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Workspaces</h1>
        <p className="text-muted-foreground">
          {workspaces?.length} workspaces registados
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trialing">Em trial</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workspaces Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Faturação</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Utilizadores</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkspaces?.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">{ws.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ws.billing?.company_name ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium">{ws.billing.company_name}</p>
                        {ws.billing.tax_id && (
                          <p className="text-muted-foreground">NIF: {ws.billing.tax_id}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Não definido</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ws.managed_by_workspace ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <Shield className="w-3 h-3 mr-1" />
                        {ws.managed_by_workspace.name}
                      </Badge>
                    ) : ws.subscription?.plan === "agency" ? (
                      <Badge className="bg-primary/10 text-primary border-primary/30">
                        <Building2 className="w-3 h-3 mr-1" />
                        É Agência
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getPlanBadge(ws.subscription?.plan)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(ws.subscription?.status || ws.status)}
                      {ws.status === "suspended" && (
                        <Badge variant="outline" className="border-destructive text-destructive text-xs">
                          Suspenso
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{ws.members_count}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <p>Leads: {ws.usage?.leads_count || 0}</p>
                      <p>Contactos: {ws.usage?.contacts_count || 0}</p>
                      <p>Empresas: {ws.usage?.companies_count || 0}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(ws.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedWorkspace(ws)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => syncStripe.mutate(ws.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Stripe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setActionDialog({ 
                            type: "change-plan", 
                            workspace: ws 
                          })}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                          Alterar plano
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {ws.status === "suspended" ? (
                          <DropdownMenuItem 
                            onClick={() => setActionDialog({ 
                              type: "reactivate", 
                              workspace: ws 
                            })}
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Reativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => setActionDialog({ 
                              type: "suspend", 
                              workspace: ws 
                            })}
                            className="text-destructive"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                        )}
                        {/* Only show assign agency for non-agency workspaces */}
                        {ws.subscription?.plan !== "agency" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedAgencyId(ws.managed_by_workspace_id || "");
                                setActionDialog({ 
                                  type: "assign-agency", 
                                  workspace: ws 
                                });
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {ws.managed_by_workspace_id ? "Alterar agência" : "Atribuir agência"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredWorkspaces?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum workspace encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace Detail Dialog */}
      <Dialog open={!!selectedWorkspace} onOpenChange={() => setSelectedWorkspace(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedWorkspace?.name}</DialogTitle>
            <DialogDescription>
              Detalhes completos do workspace
            </DialogDescription>
          </DialogHeader>
          {selectedWorkspace && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{selectedWorkspace.slug}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div className="flex gap-2">
                    {getStatusBadge(selectedWorkspace.subscription?.status || selectedWorkspace.status)}
                    {selectedWorkspace.status === "suspended" && (
                      <Badge variant="outline" className="border-destructive text-destructive">
                        Suspenso
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Plano</p>
                  {getPlanBadge(selectedWorkspace.subscription?.plan)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Próxima cobrança</p>
                  <p className="font-medium">
                    {selectedWorkspace.subscription?.current_period_end
                      ? format(new Date(selectedWorkspace.subscription.current_period_end), "dd/MM/yyyy", { locale: pt })
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Billing Info Section */}
              <div className="border-t pt-4">
                <p className="font-medium mb-3">Dados de Faturação</p>
                {selectedWorkspace.billing?.company_name ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Empresa</p>
                      <p className="font-medium">{selectedWorkspace.billing.company_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">NIF</p>
                      <p className="font-medium">{selectedWorkspace.billing.tax_id || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedWorkspace.billing.billing_email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Morada</p>
                      <p className="font-medium">
                        {[
                          selectedWorkspace.billing.billing_address,
                          selectedWorkspace.billing.billing_postal_code,
                          selectedWorkspace.billing.billing_city,
                          selectedWorkspace.billing.billing_country
                        ].filter(Boolean).join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Dados de faturação não definidos pelo cliente
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-3">Consumo atual</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Leads</p>
                    <p className="text-xl font-bold">{selectedWorkspace.usage?.leads_count || 0}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Contactos</p>
                    <p className="text-xl font-bold">{selectedWorkspace.usage?.contacts_count || 0}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Empresas</p>
                    <p className="text-xl font-bold">{selectedWorkspace.usage?.companies_count || 0}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">IA Calls</p>
                    <p className="text-xl font-bold">{selectedWorkspace.usage?.ai_calls_used || 0}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Emails</p>
                    <p className="text-xl font-bold">{selectedWorkspace.usage?.emails_sent || 0}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Utilizadores</p>
                    <p className="text-xl font-bold">{selectedWorkspace.members_count}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialogs */}
      <Dialog 
        open={actionDialog.type === "suspend"} 
        onOpenChange={() => setActionDialog({ type: null, workspace: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suspender Workspace
            </DialogTitle>
            <DialogDescription>
              Tens a certeza que queres suspender "{actionDialog.workspace?.name}"?
              <br /><br />
              O workspace ficará inacessível para todos os utilizadores até ser reativado.
              Esta ação será registada nos logs de auditoria.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ type: null, workspace: null })}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (actionDialog.workspace) {
                  updateWorkspaceStatus.mutate({
                    workspaceId: actionDialog.workspace.id,
                    status: "suspended",
                  });
                }
              }}
            >
              Confirmar Suspensão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={actionDialog.type === "reactivate"} 
        onOpenChange={() => setActionDialog({ type: null, workspace: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-success" />
              Reativar Workspace
            </DialogTitle>
            <DialogDescription>
              Tens a certeza que queres reativar "{actionDialog.workspace?.name}"?
              <br /><br />
              O workspace voltará a ficar acessível para todos os utilizadores.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ type: null, workspace: null })}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (actionDialog.workspace) {
                  updateWorkspaceStatus.mutate({
                    workspaceId: actionDialog.workspace.id,
                    status: "active",
                  });
                }
              }}
            >
              Confirmar Reativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog 
        open={actionDialog.type === "change-plan"} 
        onOpenChange={() => {
          setActionDialog({ type: null, workspace: null });
          setNewPlan("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Alterar Plano
            </DialogTitle>
            <DialogDescription>
              Alterar o plano de "{actionDialog.workspace?.name}"
              <br /><br />
              Plano atual: <strong className="capitalize">{actionDialog.workspace?.subscription?.plan || "Free"}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select 
              value={newPlan} 
              onValueChange={setNewPlan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleciona o novo plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ type: null, workspace: null });
                setNewPlan("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              disabled={!newPlan || newPlan === actionDialog.workspace?.subscription?.plan}
              onClick={() => {
                if (actionDialog.workspace && newPlan) {
                  changePlan.mutate({
                    workspaceId: actionDialog.workspace.id,
                    plan: newPlan as "free" | "basic" | "pro" | "agency",
                  });
                }
              }}
            >
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Agency Dialog */}
      <Dialog 
        open={actionDialog.type === "assign-agency"} 
        onOpenChange={() => {
          setActionDialog({ type: null, workspace: null });
          setSelectedAgencyId("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Atribuir Agência
            </DialogTitle>
            <DialogDescription>
              Atribuir uma agência para gerir "{actionDialog.workspace?.name}"
              {actionDialog.workspace?.managed_by_workspace && (
                <>
                  <br /><br />
                  Agência atual: <strong>{actionDialog.workspace.managed_by_workspace.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Select 
              value={selectedAgencyId} 
              onValueChange={setSelectedAgencyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleciona uma agência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Sem agência (remover)</span>
                </SelectItem>
                {agencyWorkspaces
                  .filter(agency => agency.id !== actionDialog.workspace?.id)
                  .map(agency => (
                    <SelectItem key={agency.id} value={agency.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-amber-500" />
                        {agency.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {agencyWorkspaces.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Não existem workspaces com plano Agency. Primeiro, atribua o plano Agency a um workspace.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ type: null, workspace: null });
                setSelectedAgencyId("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              disabled={!selectedAgencyId && !actionDialog.workspace?.managed_by_workspace_id}
              onClick={() => {
                if (actionDialog.workspace) {
                  assignAgency.mutate({
                    workspaceId: actionDialog.workspace.id,
                    agencyId: selectedAgencyId === "none" ? null : (selectedAgencyId || null),
                  });
                }
              }}
            >
              {selectedAgencyId === "none" ? "Remover Agência" : "Atribuir Agência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
