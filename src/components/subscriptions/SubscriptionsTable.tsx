import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  XCircle,
  Receipt,
  Building2,
  User,
  CalendarClock,
  Download,
  Mail,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  useSubscriptions,
  useCancelSubscription,
  useActivateSubscription,
  useUpdateSubscription,
} from "@/hooks/useSubscriptions";
import {
  SUBSCRIPTION_STATUS_CONFIG,
  BILLING_FREQUENCY_LABELS,
  PAYMENT_PROVIDER_LABELS,
  calculateMRR,
} from "@/types/subscription";
import type { Subscription, SubscriptionStatus, BillingFrequency } from "@/types/subscription";
import { ManageSubscriptionSheet } from "./ManageSubscriptionSheet";
import { toast } from "sonner";

interface SubscriptionsTableProps {
  onSelectSubscription?: (subscription: Subscription) => void;
}

export function SubscriptionsTable({ onSelectSubscription }: SubscriptionsTableProps) {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [frequencyFilter, setFrequencyFilter] = useState<BillingFrequency | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showManageSheet, setShowManageSheet] = useState(false);

  const { data: subscriptions = [], isLoading } = useSubscriptions(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const cancelSubscription = useCancelSubscription();
  const activateSubscription = useActivateSubscription();
  const updateSubscription = useUpdateSubscription();

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Frequency filter
    if (frequencyFilter !== "all" && sub.frequency !== frequencyFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const companyName = sub.company?.name?.toLowerCase() || "";
      const contactName = sub.contact?.name?.toLowerCase() || "";
      const planName = sub.plan?.name?.toLowerCase() || "";
      
      if (
        !companyName.includes(query) &&
        !contactName.includes(query) &&
        !planName.includes(query)
      ) {
        return false;
      }
    }
    
    return true;
  });

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleViewDetails = (subscription: Subscription) => {
    if (onSelectSubscription) {
      onSelectSubscription(subscription);
    } else {
      setSelectedSubscription(subscription);
      setShowManageSheet(true);
    }
  };

  const handlePause = async (subscription: Subscription) => {
    await updateSubscription.mutateAsync({
      id: subscription.id,
      status: "paused",
    });
  };

  const handleResume = async (subscription: Subscription) => {
    await activateSubscription.mutateAsync(subscription.id);
  };

  const handleCancel = async (subscription: Subscription) => {
    await cancelSubscription.mutateAsync(subscription.id);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSubscriptions.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleExportCSV = () => {
    const data = filteredSubscriptions.map((sub) => ({
      "Empresa": sub.company?.name || "",
      "Contacto": sub.contact?.name || "",
      "Plano": sub.plan?.name || "",
      "MRR": calculateMRR(sub.mrr_amount, sub.frequency),
      "Frequência": BILLING_FREQUENCY_LABELS[sub.frequency],
      "Estado": SUBSCRIPTION_STATUS_CONFIG[sub.status].label,
      "Provider": PAYMENT_PROVIDER_LABELS[sub.provider],
      "Próximo Pagamento": sub.next_payment_date || "",
      "Renovação": sub.renewal_date || "",
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent =
      headers.join(",") +
      "\n" +
      data.map((row) => headers.map((h) => `"${row[h as keyof typeof row]}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `subscriptions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("CSV exportado com sucesso");
  };

  const handleMarkAsPaid = async () => {
    const selectedSubs = filteredSubscriptions.filter((s) => selectedIds.has(s.id));
    for (const sub of selectedSubs) {
      await updateSubscription.mutateAsync({
        id: sub.id,
        last_payment_date: new Date().toISOString().split("T")[0],
      });
    }
    setSelectedIds(new Set());
    toast.success(`${selectedSubs.length} subscrição(ões) marcada(s) como paga(s)`);
  };

  const handleSendReminder = () => {
    toast.info(`Lembrete enviado para ${selectedIds.size} cliente(s)`);
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar empresa, contacto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as SubscriptionStatus | "all")}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(SUBSCRIPTION_STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={frequencyFilter}
              onValueChange={(v) => setFrequencyFilter(v as BillingFrequency | "all")}
            >
              <SelectTrigger className="w-[150px]">
                <RefreshCw className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as frequências</SelectItem>
                {Object.entries(BILLING_FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} selecionada(s)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleMarkAsPaid}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como Pago
                </Button>
                <Button size="sm" variant="outline" onClick={handleSendReminder}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Lembrete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {filteredSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Sem subscrições</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nenhuma subscrição encontrada com os filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedIds.size === filteredSubscriptions.length &&
                      filteredSubscriptions.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Próx. Pagamento</TableHead>
                <TableHead>Renovação</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => {
                const statusConfig = SUBSCRIPTION_STATUS_CONFIG[subscription.status];
                const mrr = calculateMRR(subscription.mrr_amount, subscription.frequency);
                const customerName =
                  subscription.company?.name ||
                  subscription.contact?.name ||
                  "—";
                const CustomerIcon = subscription.company ? Building2 : User;

                return (
                  <TableRow
                    key={subscription.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(subscription.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(subscription.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)}>
                      <div className="flex items-center gap-2">
                        <CustomerIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)}>
                      {subscription.plan?.name || "—"}
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)} className="font-medium">
                      {formatCurrency(mrr)}
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)}>
                      <Badge
                        variant="secondary"
                        className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)}>
                      {subscription.next_payment_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarClock className="h-3 w-3 text-muted-foreground" />
                          {format(
                            new Date(subscription.next_payment_date),
                            "dd MMM yyyy",
                            { locale: pt }
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)}>
                      {subscription.renewal_date ? (
                        format(
                          new Date(subscription.renewal_date),
                          "dd MMM yyyy",
                          { locale: pt }
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => handleViewDetails(subscription)}>
                      <Badge variant="outline" className="text-xs">
                        {PAYMENT_PROVIDER_LABELS[subscription.provider]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(subscription);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {subscription.status === "active" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePause(subscription);
                              }}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Pausar
                            </DropdownMenuItem>
                          )}
                          {subscription.status === "paused" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResume(subscription);
                              }}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Retomar
                            </DropdownMenuItem>
                          )}
                          {(subscription.status === "active" ||
                            subscription.status === "paused") && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(subscription);
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manage Sheet */}
      {selectedSubscription && (
        <ManageSubscriptionSheet
          open={showManageSheet}
          onOpenChange={(open) => {
            setShowManageSheet(open);
            if (!open) setSelectedSubscription(null);
          }}
          subscription={selectedSubscription}
        />
      )}
    </div>
  );
}
