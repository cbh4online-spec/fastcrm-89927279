import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, RefreshCw, Info } from "lucide-react";
import { useConvertOpportunityToSubscription } from "@/hooks/useSubscriptions";
import {
  BILLING_FREQUENCY_LABELS,
  PAYMENT_PROVIDER_LABELS,
  getNextBillingDate,
  calculateMRR,
} from "@/types/subscription";
import type { BillingFrequency, PaymentProvider } from "@/types/subscription";

const formSchema = z.object({
  mrr_amount: z.coerce.number().min(0, "Valor deve ser positivo"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "semi_annual", "yearly"]),
  provider: z.enum(["stripe", "manual", "other"]),
  start_date: z.string().min(1, "Data de início obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface Opportunity {
  id: string;
  title: string;
  value: number;
  lead_id?: string | null;
  lead?: { id: string; name: string; email?: string | null } | null;
}

interface ConvertOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity | null;
  onSuccess?: () => void;
}

export function ConvertOpportunityDialog({
  open,
  onOpenChange,
  opportunity,
  onSuccess,
}: ConvertOpportunityDialogProps) {
  const convertToSubscription = useConvertOpportunityToSubscription();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mrr_amount: opportunity?.value || 0,
      frequency: "monthly",
      provider: "manual",
      start_date: new Date().toISOString().split("T")[0],
    },
  });

  // Update form when opportunity changes
  if (opportunity && form.getValues("mrr_amount") !== opportunity.value) {
    form.setValue("mrr_amount", opportunity.value);
  }

  const mrrAmount = form.watch("mrr_amount");
  const frequency = form.watch("frequency");
  const startDate = form.watch("start_date");

  const mrr = calculateMRR(mrrAmount, frequency as BillingFrequency);
  const nextPaymentDate = startDate
    ? getNextBillingDate(new Date(startDate), frequency as BillingFrequency)
    : null;

  const onSubmit = async (values: FormValues) => {
    if (!opportunity) return;

    await convertToSubscription.mutateAsync({
      opportunityId: opportunity.id,
      subscriptionData: {
        mrr_amount: values.mrr_amount,
        frequency: values.frequency as BillingFrequency,
        provider: values.provider as PaymentProvider,
        start_date: values.start_date,
        next_payment_date: nextPaymentDate?.toISOString().split("T")[0],
      },
    });

    onOpenChange(false);
    form.reset();
    onSuccess?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Converter em Subscrição
          </DialogTitle>
          <DialogDescription>
            Transforme esta oportunidade num contrato recorrente.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A oportunidade <strong>"{opportunity.title}"</strong> será marcada como ganha
            e ligada à nova subscrição.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mrr_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRR (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BILLING_FREQUENCY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* MRR Preview */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MRR</span>
                <span className="font-semibold text-primary">{formatCurrency(mrr)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">ARR</span>
                <span className="font-semibold">{formatCurrency(mrr * 12)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_PROVIDER_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {nextPaymentDate && (
              <p className="text-sm text-muted-foreground">
                Primeiro pagamento: {nextPaymentDate.toLocaleDateString("pt-PT")}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={convertToSubscription.isPending}>
                {convertToSubscription.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Converter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
