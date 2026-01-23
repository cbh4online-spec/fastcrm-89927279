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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import type { Subscription, SubscriptionStatus } from "@/types/subscription";

interface SubscriptionsListProps {
  statusFilter?: SubscriptionStatus;
  contactId?: string;
  companyId?: string;
  onSelectSubscription?: (subscription: Subscription) => void;
}

export function SubscriptionsList({
  statusFilter,
  contactId,
  companyId,
  onSelectSubscription,
}: SubscriptionsListProps) {
  const navigate = useNavigate();
  const { data: subscriptions, isLoading } = useSubscriptions({
    status: statusFilter,
    contact_id: contactId,
    company_id: companyId,
  });
  const cancelSubscription = useCancelSubscription();
  const activateSubscription = useActivateSubscription();
  const updateSubscription = useUpdateSubscription();

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
      navigate(`/dashboard/subscriptions/${subscription.id}`);
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Sem subscrições</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Crie a primeira subscrição para começar a gerir receita recorrente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>MRR</TableHead>
            <TableHead>Ciclo</TableHead>
            <TableHead>Próx. Pagamento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => {
            const statusConfig = SUBSCRIPTION_STATUS_CONFIG[subscription.status];
            const mrr = calculateMRR(subscription.mrr_amount, subscription.frequency);
            const customerName =
              subscription.company?.name ||
              subscription.contact?.name ||
              subscription.plan?.name ||
              "—";
            const CustomerIcon = subscription.company ? Building2 : User;

            return (
              <TableRow
                key={subscription.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewDetails(subscription)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CustomerIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{customerName}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(mrr)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {BILLING_FREQUENCY_LABELS[subscription.frequency]}
                  </Badge>
                </TableCell>
                <TableCell>
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
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                  >
                    {statusConfig.label}
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
  );
}
