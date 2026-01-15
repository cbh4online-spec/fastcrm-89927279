import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  CreditCard,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function BillingSection() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("subscriptions");
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading: subsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ["super-admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_subscriptions")
        .select(`
          *,
          workspaces (id, name, slug)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: billingEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["super-admin-billing-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_events")
        .select(`
          *,
          workspaces (id, name, slug)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const { data: failedPayments } = useQuery({
    queryKey: ["super-admin-failed-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_events")
        .select(`
          *,
          workspaces (id, name, slug)
        `)
        .eq("event_type", "invoice.payment_failed")
        .eq("processed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const markAsResolved = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("billing_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", eventId);

      if (error) throw error;

      // Log action
      await supabase.rpc("log_admin_action", {
        p_action_type: "payment_marked_resolved",
        p_target_type: "billing_event",
        p_target_id: eventId,
        p_details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-billing-events"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-failed-payments"] });
      toast.success("Pagamento marcado como resolvido");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
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
      case "incomplete":
        return <Badge variant="outline">Incompleto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("payment_failed")) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (eventType.includes("paid") || eventType.includes("succeeded")) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (eventType.includes("created") || eventType.includes("updated")) {
      return <RefreshCw className="h-4 w-4 text-info" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const filteredSubscriptions = subscriptions?.filter((sub: any) =>
    sub.workspaces?.name?.toLowerCase().includes(search.toLowerCase()) ||
    sub.workspaces?.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEvents = billingEvents?.filter((event: any) =>
    event.workspaces?.name?.toLowerCase().includes(search.toLowerCase()) ||
    event.event_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Stripe</h1>
          <p className="text-muted-foreground">
            Gestão de subscrições, pagamentos e sincronização Stripe
          </p>
        </div>
      </div>

      {/* Failed Payments Alert */}
      {failedPayments && failedPayments.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Pagamentos Falhados ({failedPayments.length})
            </CardTitle>
            <CardDescription>
              Existem pagamentos que requerem atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedPayments.slice(0, 5).map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{event.workspaces?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsResolved.mutate(event.id)}
                  >
                    Marcar resolvido
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscrições
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Receipt className="h-4 w-4" />
            Eventos Stripe
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchSubs();
                refetchEvents();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="pt-6">
              {subsLoading ? (
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
                      <TableHead>Próxima cobrança</TableHead>
                      <TableHead>Stripe ID</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions?.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.workspaces?.name}</p>
                            <p className="text-xs text-muted-foreground">{sub.workspaces?.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {sub.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          {sub.current_period_end
                            ? format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: pt })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {sub.stripe_subscription_id?.slice(0, 20)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {sub.stripe_customer_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                window.open(
                                  `https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`,
                                  "_blank"
                                );
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="pt-6">
              {eventsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
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
                    {filteredEvents?.map((event: any) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.event_type)}
                            <span className="font-mono text-sm">{event.event_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{event.workspaces?.name || "-"}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
