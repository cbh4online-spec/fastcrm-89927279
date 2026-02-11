import { useState } from "react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientUsers, useClientOrders } from "@/hooks/useClientUsers";
import { clientUserStatusConfig, type ClientUserStatus, type ClientUser } from "@/types/client-user";
import { orderNoteStatusConfig } from "@/types/order-note";
import { EditClientDialog } from "./EditClientDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Search, Mail, Phone, Building2, CreditCard, FileText, Eye, X, MoreHorizontal, Pencil, Send, Loader2 } from "lucide-react";

export function ClientUsersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientUserStatus | "all">("all");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientUser | null>(null);

  const { clients, loading, error, refetch } = useClientUsers({
    status: statusFilter,
    search,
  });

  const { orders: clientOrders, loading: ordersLoading } = useClientOrders(
    selectedClient || undefined
  );

  const resendInvitationMutation = useMutation({
    mutationFn: async (client: ClientUser) => {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", client.workspace_id)
        .single();

      // Create new auth user or update password
      const { data: authResult, error: authError } = await supabase.functions.invoke(
        "create-client-auth-user",
        {
          body: {
            email: client.email,
            name: client.name,
            workspaceId: client.workspace_id,
            clientUserId: client.id,
          },
        }
      );

      if (authError) {
        throw new Error("Erro ao gerar novas credenciais");
      }

      if (!authResult?.success) {
        throw new Error(authResult?.error || "Erro ao gerar novas credenciais");
      }

      const temporaryPassword = authResult.data.temporaryPassword;

      // Send invitation email with new temporary password
      const { error } = await supabase.functions.invoke(
        "send-client-invitation",
        {
          body: {
            clientName: client.name,
            clientEmail: client.email,
            workspaceName: workspace?.name || "FastCRM",
            workspaceId: client.workspace_id,
            portalUrl: `${getPublicBaseUrl()}/client/login`,
            temporaryPassword: temporaryPassword,
          },
        }
      );

      if (error) throw error;
      return client;
    },
    onSuccess: (client) => {
      toast.success(`Convite reenviado com novas credenciais para ${client.email}`);
    },
    onError: (error) => {
      toast.error("Erro ao reenviar convite: " + error.message);
    },
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const hasActiveFilters = search || statusFilter !== "all";

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Erro ao carregar clientes: {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Client List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou NIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ClientUserStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Limite Crédito</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const statusConfig = clientUserStatusConfig[client.status];
                  return (
                    <TableRow
                      key={client.id}
                      className={`cursor-pointer ${
                        selectedClient === client.id
                          ? "bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedClient(client.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </span>
                            {client.tax_id && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {client.tax_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                        >
                          {statusConfig.labelPT}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.credit_limit > 0 ? (
                          <span className="font-medium">
                            €{client.credit_limit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client.id);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditingClient(client);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {client.status === "pending" && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resendInvitationMutation.mutate(client);
                                }}
                                disabled={resendInvitationMutation.isPending}
                              >
                                {resendInvitationMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Reenviar Convite
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Client Detail Sidebar */}
      <div>
        {selectedClient ? (
          <ClientDetailCard
            clientId={selectedClient}
            clients={clients}
            orders={clientOrders}
            ordersLoading={ordersLoading}
            onViewOrder={(id) => navigate(`/dashboard/order-notes/${id}`)}
            onResendInvitation={(client) => resendInvitationMutation.mutate(client)}
            isResending={resendInvitationMutation.isPending}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Selecione um cliente para ver os detalhes</p>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Edit Dialog */}
      <EditClientDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

function ClientDetailCard({
  clientId,
  clients,
  orders,
  ordersLoading,
  onViewOrder,
  onResendInvitation,
  isResending,
}: {
  clientId: string;
  clients: ClientUser[];
  orders: any[];
  ordersLoading: boolean;
  onViewOrder: (id: string) => void;
  onResendInvitation: (client: ClientUser) => void;
  isResending: boolean;
}) {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;

  const statusConfig = clientUserStatusConfig[client.status as ClientUserStatus];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{client.name}</span>
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
            {statusConfig.labelPT}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            {client.email}
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {client.phone}
            </div>
          )}
          {client.tax_id && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              NIF: {client.tax_id}
            </div>
          )}
          {client.company && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {client.company.name}
            </div>
          )}
          {client.credit_limit > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Limite: €{client.credit_limit.toFixed(2)}
            </div>
          )}
        </div>

        {/* Resend Invitation Button */}
        {client.status === "pending" && (
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onResendInvitation(client)}
              disabled={isResending}
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Reenviar Convite
            </Button>
          </div>
        )}

        {/* Recent Orders */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-3">Encomendas Recentes</h4>
          {ordersLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem encomendas</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order: any) => {
                const statusCfg = orderNoteStatusConfig[order.status as keyof typeof orderNoteStatusConfig];
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                    onClick={() => onViewOrder(order.id)}
                  >
                    <div>
                      <p className="font-mono text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.submitted_at
                          ? format(new Date(order.submitted_at), "dd/MM/yyyy")
                          : format(new Date(order.created_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={`${statusCfg?.bgColor} ${statusCfg?.color} border-0 text-xs`}
                      >
                        {statusCfg?.labelPT}
                      </Badge>
                      <p className="text-sm font-medium mt-1">
                        €{order.total_gross?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
