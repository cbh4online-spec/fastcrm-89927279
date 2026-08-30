import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
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
  Shield,
  Plus,
  Users,
  Pencil,
  Trash2,
  Coins,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { WorkspaceMembersPanel } from "./WorkspaceMembersPanel";
import { useSaasAdminActions } from "@/hooks/useSaasAdminActions";


interface OnboardingData {
  business_type?: string;
  custom_business_type?: string;
  success_definition?: string;
  process_description?: string;
  channels?: string[];
  completed_at?: string;
  skipped?: boolean;
}

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
    trial_ends_at: string | null;
    trial_started_at: string | null;
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
  onboarding?: OnboardingData;
  credit_balance?: number;
}

export function WorkspacesSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceDetails | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "suspend" | "reactivate" | "change-plan" | "assign-agency" | "edit-name" | "delete" | "assign-credits" | null;
    workspace: WorkspaceDetails | null;
  }>({ type: null, workspace: null });
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [newPlan, setNewPlan] = useState<string>("");
  const [newSubStatus, setNewSubStatus] = useState<string>("");
  const [newTrialEnd, setNewTrialEnd] = useState<string>("");
  const [newPeriodEnd, setNewPeriodEnd] = useState<string>("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [creditsAmount, setCreditsAmount] = useState<string>("");
  const [creditsDescription, setCreditsDescription] = useState("");
  const { user } = useAuth();
  
  // New state for create workspace and members panel
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersPanel, setMembersPanel] = useState<{ open: boolean; workspaceId: string | null; workspaceName: string }>({
    open: false,
    workspaceId: null,
    workspaceName: ""
  });
  
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
            stripe_customer_id,
            trial_ends_at,
            trial_started_at
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

      // Get accurate usage counts via RPC (no 1000-row limit)
      const { data: usageCounts } = await supabase.rpc('get_workspace_usage_counts');

      const leadsCounts: Record<string, number> = {};
      const contactsCounts: Record<string, number> = {};
      const companiesCounts: Record<string, number> = {};
      (usageCounts || []).forEach((row: any) => {
        leadsCounts[row.workspace_id] = Number(row.leads_count) || 0;
        contactsCounts[row.workspace_id] = Number(row.contacts_count) || 0;
        companiesCounts[row.workspace_id] = Number(row.companies_count) || 0;
      });

      // Get onboarding data per workspace
      const { data: onboardingData } = await supabase
        .from("workspace_onboarding")
        .select("*");

      const onboardingMap = onboardingData?.reduce((acc: Record<string, OnboardingData>, o: any) => {
        acc[o.workspace_id] = {
          business_type: o.business_type,
          custom_business_type: o.custom_business_type,
          success_definition: o.success_definition,
          process_description: o.process_description,
          channels: o.channels,
          completed_at: o.completed_at,
          skipped: o.skipped,
        };
        return acc;
      }, {}) || {};

      // Get credit wallet balances
      const { data: walletsData } = await supabase
        .from("credit_wallets")
        .select("workspace_id, balance");

      const walletBalances = walletsData?.reduce((acc: Record<string, number>, w: any) => {
        acc[w.workspace_id] = w.balance;
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
          onboarding: onboardingMap[ws.id] || undefined,
          credit_balance: walletBalances[ws.id] ?? 0,
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

  const { changePlan: sharedChangePlan, assignCredits: sharedAssignCredits } = useSaasAdminActions();

  const changePlan = {
    isPending: sharedChangePlan.isPending,
    mutate: (vars: {
      workspaceId: string;
      plan: string;
      subStatus?: string;
      trialEnd?: string;
      periodEnd?: string;
    }) =>
      sharedChangePlan.mutate(vars, {
        onSuccess: () => {
          setActionDialog({ type: null, workspace: null });
          setNewPlan("");
          setNewSubStatus("");
          setNewTrialEnd("");
          setNewPeriodEnd("");
        },
      }),
  };


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

  const updateWorkspaceName = useMutation({
    mutationFn: async ({ workspaceId, name, slug }: { workspaceId: string; name: string; slug: string }) => {
      // Check if slug already exists (excluding current workspace)
      const { data: existing } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", slug)
        .neq("id", workspaceId)
        .maybeSingle();

      if (existing) {
        throw new Error("Este slug já está em uso por outro workspace");
      }

      const { error } = await supabase
        .from("workspaces")
        .update({ name, slug })
        .eq("id", workspaceId);
      
      if (error) throw error;

      // Log the action
      await supabase.rpc("log_admin_action", {
        p_action_type: "workspace_renamed",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: workspaceId,
        p_details: { new_name: name, new_slug: slug },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success("Nome do workspace atualizado");
      setActionDialog({ type: null, workspace: null });
      setEditName("");
      setEditSlug("");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: async (workspaceId: string) => {
      // Log the action before deletion
      await supabase.rpc("log_admin_action", {
        p_action_type: "workspace_deleted",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: null,
        p_details: {},
      });

      const { error } = await supabase
        .from("workspaces")
        .delete()
        .eq("id", workspaceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
      toast.success("Workspace apagado permanentemente");
      setActionDialog({ type: null, workspace: null });
    },
    onError: (error) => {
      toast.error("Erro ao apagar workspace: " + error.message);
    },
  });

  const assignCredits = {
    isPending: sharedAssignCredits.isPending,
    mutate: (vars: { workspaceId: string; amount: number; description: string }) =>
      sharedAssignCredits.mutate(vars, {
        onSuccess: () => {
          setActionDialog({ type: null, workspace: null });
          setCreditsAmount("");
          setCreditsDescription("");
        },
      }),
  };


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

  const getTrialBadge = (ws: WorkspaceDetails) => {
    const sub = ws.subscription;
    if (!sub) return null;

    if (sub.status === "trialing" && sub.trial_ends_at) {
      const daysLeft = Math.ceil(
        (new Date(sub.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysLeft <= 0) {
        return <Badge variant="destructive" className="text-[10px]">Trial expirado</Badge>;
      }
      if (daysLeft <= 3) {
        return <Badge variant="destructive" className="text-[10px]">Trial: {daysLeft}d</Badge>;
      }
      return <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">Trial: {daysLeft}d</Badge>;
    }

    if (sub.status === "active" && sub.plan !== "free" && sub.plan !== "starter" && sub.current_period_end) {
      const daysLeft = Math.ceil(
        (new Date(sub.current_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysLeft <= 0) {
        return <Badge variant="destructive" className="text-[10px]">Expirado</Badge>;
      }
      if (daysLeft <= 7) {
        return <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">Renova: {daysLeft}d</Badge>;
      }
      return <Badge variant="outline" className="text-[10px]">Renova: {daysLeft}d</Badge>;
    }

    return null;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Workspaces</h1>
          <p className="text-muted-foreground">
            {workspaces?.length} workspaces registados
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Workspace
        </Button>
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
                <TableHead>Trial / Renovação</TableHead>
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
                  <TableCell>{getTrialBadge(ws)}</TableCell>
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
                        <DropdownMenuItem onClick={() => setMembersPanel({ open: true, workspaceId: ws.id, workspaceName: ws.name })}>
                          <Users className="h-4 w-4 mr-2" />
                          Gerir membros
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => syncStripe.mutate(ws.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Stripe
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setEditName(ws.name);
                            setEditSlug(ws.slug);
                            setActionDialog({ type: "edit-name", workspace: ws });
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar nome
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
                        <DropdownMenuItem 
                          onClick={() => setActionDialog({ 
                            type: "assign-credits", 
                            workspace: ws 
                          })}
                        >
                          <Coins className="h-4 w-4 mr-2" />
                          Gerir créditos
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setActionDialog({ 
                            type: "delete", 
                            workspace: ws 
                          })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar workspace
                        </DropdownMenuItem>
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
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">Consumo atual</p>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{selectedWorkspace.credit_balance ?? 0} créditos</span>
                  </div>
                </div>
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

              {/* Onboarding Section */}
              <div className="border-t pt-4">
                <p className="font-medium mb-3">Respostas do Onboarding</p>
                {selectedWorkspace.onboarding ? (
                  selectedWorkspace.onboarding.skipped ? (
                    <p className="text-sm text-muted-foreground italic">
                      Onboarding foi saltado pelo utilizador
                    </p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground">Tipo de Negócio</p>
                          <p className="font-medium">
                            {selectedWorkspace.onboarding.custom_business_type || selectedWorkspace.onboarding.business_type || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Definição de Sucesso</p>
                          <p className="font-medium">{selectedWorkspace.onboarding.success_definition || "-"}</p>
                        </div>
                      </div>
                      {selectedWorkspace.onboarding.process_description && (
                        <div>
                          <p className="text-muted-foreground">Descrição do Processo</p>
                          <p className="font-medium text-sm bg-muted p-2 rounded-md mt-1">
                            {selectedWorkspace.onboarding.process_description}
                          </p>
                        </div>
                      )}
                      {selectedWorkspace.onboarding.channels && selectedWorkspace.onboarding.channels.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-1">Canais de Entrada</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedWorkspace.onboarding.channels.map((channel, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedWorkspace.onboarding.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          Completado em: {format(new Date(selectedWorkspace.onboarding.completed_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </p>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Onboarding ainda não realizado
                  </p>
                )}
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
          setNewSubStatus("");
          setNewTrialEnd("");
          setNewPeriodEnd("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Alterar Plano & Subscrição
            </DialogTitle>
            <DialogDescription>
              Alterar o plano de "{actionDialog.workspace?.name}"
              <br />
              Plano atual: <strong className="capitalize">{actionDialog.workspace?.subscription?.plan || "Free"}</strong>
              {" · "}Estado: <strong className="capitalize">{actionDialog.workspace?.subscription?.status || "active"}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter (Free)</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado da subscrição</Label>
                <Select value={newSubStatus} onValueChange={(val) => {
                  setNewSubStatus(val);
                  if (val === "trialing") {
                    setNewTrialEnd(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Manter actual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trialing">Trial (14 dias)</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newSubStatus === "trialing" && (
              <div className="space-y-2">
                <Label>Data fim do trial</Label>
                <Input
                  type="date"
                  value={newTrialEnd}
                  onChange={(e) => setNewTrialEnd(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Por defeito: 14 dias a partir de hoje
                </p>
              </div>
            )}

            {newSubStatus !== "trialing" && (
              <div className="space-y-2">
                <Label>Data fim do período (renovação)</Label>
                <Input
                  type="date"
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                  placeholder="Opcional"
                />
                <p className="text-xs text-muted-foreground">
                  Deixar vazio para manter a data actual
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ type: null, workspace: null });
                setNewPlan("");
                setNewSubStatus("");
                setNewTrialEnd("");
                setNewPeriodEnd("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              disabled={!newPlan && !newSubStatus}
              onClick={() => {
                if (actionDialog.workspace) {
                  changePlan.mutate({
                    workspaceId: actionDialog.workspace.id,
                    plan: (newPlan || actionDialog.workspace.subscription?.plan || "starter") as any,
                    subStatus: newSubStatus || undefined,
                    trialEnd: newTrialEnd ? new Date(newTrialEnd).toISOString() : undefined,
                    periodEnd: newPeriodEnd ? new Date(newPeriodEnd).toISOString() : undefined,
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

      {/* Edit Name Dialog */}
      <Dialog 
        open={actionDialog.type === "edit-name"} 
        onOpenChange={() => {
          setActionDialog({ type: null, workspace: null });
          setEditName("");
          setEditSlug("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Workspace
            </DialogTitle>
            <DialogDescription>
              Alterar o nome e slug do workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Workspace</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  // Auto-generate slug
                  const generatedSlug = e.target.value
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                  setEditSlug(generatedSlug);
                }}
                placeholder="Nome do workspace"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug (URL)</Label>
              <Input
                id="edit-slug"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="slug-do-workspace"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único usado em URLs
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ type: null, workspace: null });
                setEditName("");
                setEditSlug("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              disabled={!editName || !editSlug || updateWorkspaceName.isPending}
              onClick={() => {
                if (actionDialog.workspace) {
                  updateWorkspaceName.mutate({
                    workspaceId: actionDialog.workspace.id,
                    name: editName,
                    slug: editSlug,
                  });
                }
              }}
            >
              {updateWorkspaceName.isPending ? "A guardar..." : "Guardar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <Dialog 
        open={actionDialog.type === "delete"} 
        onOpenChange={() => setActionDialog({ type: null, workspace: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Apagar Workspace Permanentemente
            </DialogTitle>
            <DialogDescription>
              <strong className="text-destructive">ATENÇÃO: Esta ação é irreversível!</strong>
              <br /><br />
              Tem a certeza que deseja apagar o workspace <strong>"{actionDialog.workspace?.name}"</strong>?
              <br /><br />
              <span className="text-sm">
                Todos os dados associados serão eliminados:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>{actionDialog.workspace?.usage?.leads_count || 0} leads</li>
                  <li>{actionDialog.workspace?.usage?.contacts_count || 0} contactos</li>
                  <li>{actionDialog.workspace?.usage?.companies_count || 0} empresas</li>
                  <li>{actionDialog.workspace?.members_count || 0} membros</li>
                  <li>Todas as propostas, oportunidades, conversas e ficheiros</li>
                </ul>
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ type: null, workspace: null })}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              disabled={deleteWorkspace.isPending}
              onClick={() => {
                if (actionDialog.workspace) {
                  deleteWorkspace.mutate(actionDialog.workspace.id);
                }
              }}
            >
              {deleteWorkspace.isPending ? "A apagar..." : "Apagar Permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Credits Dialog */}
      <Dialog 
        open={actionDialog.type === "assign-credits"} 
        onOpenChange={() => {
          setActionDialog({ type: null, workspace: null });
          setCreditsAmount("");
          setCreditsDescription("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Gerir Créditos
            </DialogTitle>
            <DialogDescription>
              Atribuir ou remover créditos manualmente do workspace "{actionDialog.workspace?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="credits-amount">Quantidade de créditos</Label>
              <Input
                id="credits-amount"
                type="number"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                placeholder="Ex: 100 (positivo para adicionar, negativo para remover)"
              />
              <p className="text-xs text-muted-foreground">
                Use valores positivos para adicionar e negativos para remover créditos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits-description">Motivo / Descrição</Label>
              <Textarea
                id="credits-description"
                value={creditsDescription}
                onChange={(e) => setCreditsDescription(e.target.value)}
                placeholder="Ex: Bónus de onboarding, compensação, ajuste manual..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ type: null, workspace: null });
                setCreditsAmount("");
                setCreditsDescription("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              disabled={!creditsAmount || Number(creditsAmount) === 0 || assignCredits.isPending}
              onClick={() => {
                if (actionDialog.workspace && creditsAmount) {
                  assignCredits.mutate({
                    workspaceId: actionDialog.workspace.id,
                    amount: Number(creditsAmount),
                    description: creditsDescription,
                  });
                }
              }}
            >
              {assignCredits.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : Number(creditsAmount) > 0 ? (
                `Adicionar ${creditsAmount} créditos`
              ) : Number(creditsAmount) < 0 ? (
                `Remover ${Math.abs(Number(creditsAmount))} créditos`
              ) : (
                "Atribuir créditos"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {/* Workspace Members Panel */}
      <WorkspaceMembersPanel
        workspaceId={membersPanel.workspaceId}
        workspaceName={membersPanel.workspaceName}
        open={membersPanel.open}
        onOpenChange={(open) => setMembersPanel(prev => ({ ...prev, open }))}
      />
    </div>
  );
}
