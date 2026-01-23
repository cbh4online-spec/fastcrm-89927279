import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pause,
  Play,
  XCircle,
  RefreshCw,
  CalendarClock,
  DollarSign,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useUpdateSubscription,
  useCancelSubscription,
  useActivateSubscription,
} from "@/hooks/useSubscriptions";
import {
  SUBSCRIPTION_STATUS_CONFIG,
  BILLING_FREQUENCY_LABELS,
  calculateMRR,
} from "@/types/subscription";
import type { Subscription, BillingFrequency } from "@/types/subscription";
import { SubscriptionTimeline } from "./SubscriptionTimeline";

interface ManageSubscriptionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
}

export function ManageSubscriptionSheet({
  open,
  onOpenChange,
  subscription,
}: ManageSubscriptionSheetProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMrr, setEditedMrr] = useState(subscription.mrr_amount);
  const [editedFrequency, setEditedFrequency] = useState(subscription.frequency);

  const updateSubscription = useUpdateSubscription();
  const cancelSubscription = useCancelSubscription();
  const activateSubscription = useActivateSubscription();

  const statusConfig = SUBSCRIPTION_STATUS_CONFIG[subscription.status];
  const mrr = calculateMRR(subscription.mrr_amount, subscription.frequency);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const handlePause = async () => {
    await updateSubscription.mutateAsync({
      id: subscription.id,
      status: "paused",
    });
  };

  const handleResume = async () => {
    await activateSubscription.mutateAsync(subscription.id);
  };

  const handleCancel = async () => {
    await cancelSubscription.mutateAsync(subscription.id);
    setShowCancelDialog(false);
  };

  const handleSaveChanges = async () => {
    await updateSubscription.mutateAsync({
      id: subscription.id,
      mrr_amount: editedMrr,
      frequency: editedFrequency,
    });
    setIsEditing(false);
  };

  const isPending =
    updateSubscription.isPending ||
    cancelSubscription.isPending ||
    activateSubscription.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Gerir Subscrição
            </SheetTitle>
            <SheetDescription>
              {subscription.company?.name || subscription.contact?.name || "Subscrição"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado</span>
              <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                {statusConfig.label}
              </Badge>
            </div>

            <Separator />

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  MRR
                </div>
                <p className="text-xl font-bold text-primary">{formatCurrency(mrr)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  Ciclo
                </div>
                <p className="text-xl font-bold">
                  {BILLING_FREQUENCY_LABELS[subscription.frequency]}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              {subscription.start_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Início</span>
                  <span>{format(new Date(subscription.start_date), "dd MMM yyyy", { locale: pt })}</span>
                </div>
              )}
              {subscription.next_payment_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Próximo Pagamento
                  </span>
                  <span>{format(new Date(subscription.next_payment_date), "dd MMM yyyy", { locale: pt })}</span>
                </div>
              )}
              {subscription.renewal_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Renovação</span>
                  <span>{format(new Date(subscription.renewal_date), "dd MMM yyyy", { locale: pt })}</span>
                </div>
              )}
              {subscription.last_payment_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Último Pagamento</span>
                  <span>{format(new Date(subscription.last_payment_date), "dd MMM yyyy", { locale: pt })}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Edit Fields */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Valor (€)</Label>
                  <Input
                    type="number"
                    value={editedMrr}
                    onChange={(e) => setEditedMrr(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={editedFrequency}
                    onValueChange={(v) => setEditedFrequency(v as BillingFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BILLING_FREQUENCY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSaveChanges}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsEditing(true)}
              >
                Alterar Plano / Valor
              </Button>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-2">
              {subscription.status === "active" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePause}
                  disabled={isPending}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar Subscrição
                </Button>
              )}
              {subscription.status === "paused" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResume}
                  disabled={isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Retomar Subscrição
                </Button>
              )}
              {(subscription.status === "active" || subscription.status === "paused") && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Subscrição
                </Button>
              )}
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-3">Histórico</h4>
              <SubscriptionTimeline subscriptionId={subscription.id} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Subscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar a subscrição. O cliente não será mais cobrado
              e a subscrição será marcada como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscription.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
