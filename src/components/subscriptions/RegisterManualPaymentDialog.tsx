import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Receipt } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateSubscriptionEvent } from "@/hooks/useSubscriptionEvents";
import { useUpdateSubscription } from "@/hooks/useSubscriptions";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { getNextBillingDate } from "@/types/subscription";
import type { Subscription } from "@/types/subscription";

const formSchema = z.object({
  amount: z.number().min(0.01, "Montante é obrigatório"),
  payment_date: z.date(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RegisterManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  onSuccess?: () => void;
}

export function RegisterManualPaymentDialog({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: RegisterManualPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createEvent = useCreateSubscriptionEvent();
  const updateSubscription = useUpdateSubscription();
  const { workspaceClient } = useWorkspaceInstance();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: subscription.mrr_amount,
      payment_date: new Date(),
      reference: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Calculate next payment date
      const nextPaymentDate = getNextBillingDate(
        values.payment_date,
        subscription.frequency
      );

      // Create subscription event
      await createEvent.mutateAsync({
        subscription_id: subscription.id,
        event_type: "payment_succeeded",
        amount: values.amount,
        currency: "EUR",
        occurred_at: values.payment_date.toISOString(),
        notes: values.notes 
          ? `${values.reference ? `Ref: ${values.reference}. ` : ""}${values.notes}`
          : values.reference 
            ? `Ref: ${values.reference}`
            : "Pagamento manual registado",
        raw_payload: {
          type: "manual",
          reference: values.reference,
          registered_at: new Date().toISOString(),
        },
      });

      // Update subscription dates
      await updateSubscription.mutateAsync({
        id: subscription.id,
        status: "active",
        last_payment_date: values.payment_date.toISOString(),
        next_payment_date: nextPaymentDate.toISOString(),
      });

      // Update opportunity if linked
      if (subscription.opportunity_id && workspaceClient) {
        await workspaceClient
          .from("opportunities")
          .update({
            subscription_status: "active",
            last_payment_date: values.payment_date.toISOString(),
            next_payment_date: nextPaymentDate.toISOString(),
          })
          .eq("id", subscription.opportunity_id);
      }

      toast.success("Pagamento registado com sucesso");
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error registering payment:", error);
      toast.error("Erro ao registar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registar Pagamento Manual
          </DialogTitle>
          <DialogDescription>
            Registar um pagamento manual para a subscrição de{" "}
            {subscription.company?.name || subscription.contact?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Montante (€) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              MRR da subscrição: {formatCurrency(subscription.mrr_amount)}
            </p>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Data do Pagamento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("payment_date") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("payment_date") ? (
                    format(form.watch("payment_date"), "PPP", { locale: pt })
                  ) : (
                    <span>Selecionar data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("payment_date")}
                  onSelect={(date) => date && form.setValue("payment_date", date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Referência</Label>
            <Input
              id="reference"
              placeholder="Nº transferência, cheque, etc."
              {...form.register("reference")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre o pagamento..."
              rows={2}
              {...form.register("notes")}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registar Pagamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
