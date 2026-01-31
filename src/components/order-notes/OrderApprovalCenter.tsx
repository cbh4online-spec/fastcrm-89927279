import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useOrderApprovals, useApprovalStats } from "@/hooks/useOrderApprovals";
import { orderNoteStatusConfig } from "@/types/order-note";
import type { OrderNote } from "@/types/order-note";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  Search, 
  Check, 
  X, 
  Loader2, 
  FileText, 
  CreditCard, 
  AlertTriangle,
  User,
  Calendar,
  Euro,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderApprovalCenter() {
  const [activeTab, setActiveTab] = useState<"all" | "installment" | "high_value">("all");
  const [search, setSearch] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState<string | null>(null);

  const { data: stats } = useApprovalStats();
  const { 
    pendingOrders, 
    loading, 
    approveOrder, 
    rejectOrder, 
    bulkApprove 
  } = useOrderApprovals({
    type: activeTab === "all" ? undefined : activeTab,
    search: search || undefined,
  });

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(pendingOrders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleApprove = async (orderId: string) => {
    setOrderToApprove(orderId);
    setApproveDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!orderToApprove) return;
    await approveOrder(orderToApprove, approveNotes || undefined);
    setApproveDialogOpen(false);
    setOrderToApprove(null);
    setApproveNotes("");
  };

  const handleReject = (orderId: string) => {
    setOrderToReject(orderId);
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!orderToReject || !rejectReason.trim()) return;
    await rejectOrder(orderToReject, rejectReason);
    setRejectDialogOpen(false);
    setOrderToReject(null);
    setRejectReason("");
  };

  const handleBulkApprove = async () => {
    if (selectedOrders.length === 0) return;
    await bulkApprove(selectedOrders);
    setSelectedOrders([]);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.withInstallments ?? 0}</p>
                <p className="text-xs text-muted-foreground">Com Prestações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.highValue ?? 0}</p>
                <p className="text-xs text-muted-foreground">Valor Elevado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(stats?.totalValue ?? 0).toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Centro de Aprovações</CardTitle>
              <CardDescription>
                Gerir encomendas pendentes de aprovação
              </CardDescription>
            </div>
            {selectedOrders.length > 0 && (
              <Button onClick={handleBulkApprove} className="gap-2">
                <Check className="h-4 w-4" />
                Aprovar {selectedOrders.length} selecionadas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">
                  Todas
                  {stats?.total ? <Badge variant="secondary" className="ml-1.5 px-1.5">{stats.total}</Badge> : null}
                </TabsTrigger>
                <TabsTrigger value="installment">
                  Prestações
                  {stats?.withInstallments ? <Badge variant="secondary" className="ml-1.5 px-1.5">{stats.withInstallments}</Badge> : null}
                </TabsTrigger>
                <TabsTrigger value="high_value">
                  Valor Alto
                  {stats?.highValue ? <Badge variant="secondary" className="ml-1.5 px-1.5">{stats.highValue}</Badge> : null}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Sem encomendas pendentes de aprovação</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium">
                  <Checkbox
                    checked={selectedOrders.length === pendingOrders.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="flex-1">Encomenda</span>
                  <span className="w-32">Cliente</span>
                  <span className="w-24 text-right">Valor</span>
                  <span className="w-32 text-right">Ações</span>
                </div>

                {pendingOrders.map((order) => (
                  <OrderApprovalRow
                    key={order.id}
                    order={order}
                    selected={selectedOrders.includes(order.id)}
                    onSelect={(checked) => handleSelectOrder(order.id, checked)}
                    onApprove={() => handleApprove(order.id)}
                    onReject={() => handleReject(order.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Encomenda</DialogTitle>
            <DialogDescription>
              Adicione uma nota opcional para esta aprovação
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Notas de aprovação (opcional)..."
            value={approveNotes}
            onChange={(e) => setApproveNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmApprove} className="gap-2">
              <Check className="h-4 w-4" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Encomenda</DialogTitle>
            <DialogDescription>
              Por favor indique o motivo da rejeição
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface OrderApprovalRowProps {
  order: OrderNote;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

function OrderApprovalRow({ order, selected, onSelect, onApprove, onReject }: OrderApprovalRowProps) {
  const statusConfig = orderNoteStatusConfig[order.status];
  const clientName = order.client_user?.name || "Cliente desconhecido";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors",
      selected && "bg-primary/5 border-primary/30"
    )}>
      <Checkbox
        checked={selected}
        onCheckedChange={onSelect}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{order.order_number}</span>
          <Badge className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.labelPT}
          </Badge>
          {order.installment_requested && (
            <Badge variant="outline" className="text-xs gap-1">
              <CreditCard className="h-3 w-3" />
              {order.installment_count}x
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {order.submitted_at 
              ? format(new Date(order.submitted_at), "dd/MM/yyyy HH:mm", { locale: pt })
              : format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: pt })
            }
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {order.items?.length || 0} itens
          </span>
        </div>
      </div>

      <div className="w-32 truncate">
        <div className="flex items-center gap-1.5 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate" title={clientName}>{clientName}</span>
        </div>
      </div>

      <div className="w-24 text-right">
        <span className="font-semibold text-sm">
          {order.total_gross.toLocaleString("pt-PT", {
            style: "currency",
            currency: order.currency || "EUR",
          })}
        </span>
      </div>

      <div className="w-32 flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={onApprove}
          title="Aprovar"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onReject}
          title="Rejeitar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
