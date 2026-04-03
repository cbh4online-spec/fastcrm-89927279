import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Loader2,
  LinkIcon,
  Unlink,
  DollarSign,
  Zap,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  growth: 79,
  scale: 199,
  pro: 79,
  agency: 199,
  free: 0,
  trial: 0,
};

interface BillingSectionProps {
  initialTab?: "subscriptions" | "payments" | "events" | "sync";
}

export function BillingSection({ initialTab = "subscriptions" }: BillingSectionProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const queryClient = useQueryClient();

  // Primary query: workspace_plans as source of truth
  const { data: billingData, isLoading: dataLoading, refetch: refetchData } = useQuery({
    queryKey: ["super-admin-billing-plans"],
    queryFn: async () => {
      // Get all workspaces
      const { data: workspaces, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name, slug")
        .order("name");

      if (wsError) throw wsError;

      // Get active workspace_plans
      const { data: plans, error: plansError } = await supabase
        .from("workspace_plans")
        .select("*")
        .eq("status", "active");

      if (plansError) throw plansError;

      // Get workspace_subscriptions for Stripe IDs
      const { data: subs, error: subsError } = await supabase
        .from("workspace_subscriptions")
        .select("workspace_id, stripe_customer_id, stripe_subscription_id, status");

      if (subsError) throw subsError;

      // Build map
      const plansMap = new Map<string, any>();
      (plans || []).forEach((p: any) => plansMap.set(p.workspace_id, p));

      const subsMap = new Map<string, any>();
      (subs || []).forEach((s: any) => subsMap.set(s.workspace_id, s));

      return (workspaces || []).map((ws: any) => {
        const plan = plansMap.get(ws.id);
        const sub = subsMap.get(ws.id);
        return {
          workspaceId: ws.id,
          workspaceName: ws.name,
          workspaceSlug: ws.slug,
          plan: plan?.plan || "free",
          status: plan?.status || "none",
          callsUsed: plan?.calls_used || 0,
          callsIncluded: plan?.calls_included || 0,
          cycleEnd: plan?.cycle_end || null,
          cycleStart: plan?.cycle_start || null,
          stripeCustomerId: sub?.stripe_customer_id || null,
          stripeSubscriptionId: sub?.stripe_subscription_id || null,
          hasStripeBound: !!(sub?.stripe_customer_id),
        };
      });
    },
  });

  // Billing events (may be empty)
  const { data: billingEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["super-admin-billing-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_events")
        .select(`*, workspaces (id, name, slug)`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // KPIs
  const activeSubscriptions = billingData?.filter((d) => d.plan !== "free" && d.plan !== "trial") || [];
  const totalRevenue = activeSubscriptions.reduce((sum, d) => sum + (PLAN_PRICES[d.plan] || 0), 0);
  const unlinkedCount = activeSubscriptions.filter((d) => !d.hasStripeBound).length;

  const filteredData = billingData?.filter((d) =>
    d.workspaceName?.toLowerCase().includes(search.toLowerCase()) ||
    d.workspaceSlug?.toLowerCase().includes(search.toLowerCase()) ||
    d.plan?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEvents = billingEvents?.filter((event: any) =>
    event.workspaces?.name?.toLowerCase().includes(search.toLowerCase()) ||
    event.event_type?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string, plan: string) => {
    if (plan === "free") return <Badge variant="outline">Free</Badge>;
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
      case "trialing":
        return <Badge className="bg-info text-info-foreground">Trial</Badge>;
      case "canceled":
        return <Badge className="bg-destructive text-destructive-foreground">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status || "—"}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      starter: "bg-blue-500/10 text-blue-700 border-blue-200",
      growth: "bg-purple-500/10 text-purple-700 border-purple-200",
      scale: "bg-amber-500/10 text-amber-700 border-amber-200",
      pro: "bg-purple-500/10 text-purple-700 border-purple-200",
      agency: "bg-amber-500/10 text-amber-700 border-amber-200",
      free: "bg-muted text-muted-foreground",
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[plan] || ""}`}>
        {plan}
      </Badge>
    );
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("payment_failed")) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (eventType.includes("paid") || eventType.includes("succeeded")) return <CheckCircle className="h-4 w-4 text-success" />;
    if (eventType.includes("created") || eventType.includes("updated")) return <RefreshCw className="h-4 w-4 text-info" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const handleSyncAll = async () => {
    if (!billingData) return;
    const toSync = billingData.filter((d) => d.plan !== "free");
    setSyncingAll(true);
    setSyncProgress({ done: 0, total: toSync.length });

    let synced = 0;
    for (const ws of toSync) {
      try {
        await supabase.functions.invoke("check-subscription", {
          body: { workspace_id: ws.workspaceId },
        });
      } catch {
        // continue
      }
      synced++;
      setSyncProgress({ done: synced, total: toSync.length });
    }

    setSyncingAll(false);
    toast.success(`${synced} workspaces sincronizados`);
    refetchData();
  };

  const handleSyncOne = async (workspaceId: string) => {
    try {
      await supabase.functions.invoke("check-subscription", {
        body: { workspace_id: workspaceId },
      });
      toast.success("Sincronização concluída");
      refetchData();
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Stripe</h1>
        <p className="text-muted-foreground">
          Gestão de subscrições, pagamentos e sincronização Stripe
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Subscrições Ativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{activeSubscriptions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">de {billingData?.length || 0} workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Receita Estimada / mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">€{totalRevenue}</p>
            <p className="text-xs text-muted-foreground mt-1">baseado nos planos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Unlink className="h-4 w-4" />
              Sem Stripe vinculado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{unlinkedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">subscrições sem customer ID</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscrições
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Receipt className="h-4 w-4" />
            Eventos Stripe
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2">
            <Zap className="h-4 w-4" />
            Stripe Sync
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar workspace, plano..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => { refetchData(); refetchEvents(); }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="pt-6">
              {dataLoading ? (
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
                      <TableHead>Estado</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Créditos</TableHead>
                      <TableHead>Stripe</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum workspace encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredData?.map((row) => (
                      <TableRow key={row.workspaceId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.workspaceName}</p>
                            <p className="text-xs text-muted-foreground">{row.workspaceSlug}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getPlanBadge(row.plan)}</TableCell>
                        <TableCell>{getStatusBadge(row.status, row.plan)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.cycleEnd
                            ? format(new Date(row.cycleEnd), "dd/MM/yyyy", { locale: pt })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {row.callsIncluded > 0 ? (
                            <span className="text-sm">
                              {row.callsUsed.toLocaleString()} / {row.callsIncluded.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.hasStripeBound ? (
                            <Badge variant="outline" className="text-success border-success gap-1">
                              <LinkIcon className="h-3 w-3" />
                              Vinculado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground gap-1">
                              <Unlink className="h-3 w-3" />
                              Não vinculado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {row.stripeCustomerId && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `https://dashboard.stripe.com/customers/${row.stripeCustomerId}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ver no Stripe
                                </DropdownMenuItem>
                              )}
                              {row.stripeSubscriptionId && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `https://dashboard.stripe.com/subscriptions/${row.stripeSubscriptionId}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Ver Subscrição
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSyncOne(row.workspaceId)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Sincronizar com Stripe
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardContent className="pt-6">
              {eventsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : filteredEvents && filteredEvents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.event_type)}
                            <span className="font-mono text-sm">{event.event_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{event.workspaces?.name || "—"}</TableCell>
                        <TableCell>
                          {event.processed ? (
                            <Badge variant="outline" className="text-success border-success">
                              Processado
                            </Badge>
                          ) : event.error_message ? (
                            <Badge variant="outline" className="text-destructive border-destructive">
                              Erro
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">Nenhum evento registado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure o webhook Stripe para receber eventos automaticamente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Sync Tab */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Sincronização Stripe
              </CardTitle>
              <CardDescription>
                Sincronize o estado das subscrições com o Stripe para garantir dados actualizados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSyncAll}
                  disabled={syncingAll}
                  className="gap-2"
                >
                  {syncingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar Todos
                </Button>
                {syncingAll && (
                  <span className="text-sm text-muted-foreground">
                    {syncProgress.done} / {syncProgress.total} concluídos...
                  </span>
                )}
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Como funciona</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Chama a edge function <code className="bg-muted px-1 rounded">check-subscription</code> para cada workspace pago</li>
                  <li>• Verifica o estado da subscrição no Stripe via email do proprietário</li>
                  <li>• Actualiza <code className="bg-muted px-1 rounded">workspace_subscriptions</code> com os IDs e estado do Stripe</li>
                </ul>
              </div>

              {/* Summary of unlinked workspaces */}
              {unlinkedCount > 0 && (
                <div className="rounded-lg border border-warning/30 p-4 bg-warning/5">
                  <h4 className="font-medium flex items-center gap-2 text-warning">
                    <AlertCircle className="h-4 w-4" />
                    {unlinkedCount} workspace(s) sem Stripe vinculado
                  </h4>
                  <div className="mt-2 space-y-1">
                    {activeSubscriptions
                      .filter((d) => !d.hasStripeBound)
                      .map((d) => (
                        <div key={d.workspaceId} className="flex items-center justify-between text-sm">
                          <span>{d.workspaceName} ({d.plan})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSyncOne(d.workspaceId)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sincronizar
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
