import { useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, RefreshCw, Info } from "lucide-react";
import { useConvertOpportunityToSubscription } from "@/hooks/useSubscriptions";
import {
  BILLING_CYCLE_LABELS,
  PAYMENT_METHOD_LABELS,
  getNextBillingDate,
  calculateMRR,
} from "@/types/subscription";
import type { BillingCycle, PaymentMethodType } from "@/types/subscription";

const formSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Valor deve ser positivo"),
  billing_cycle: z.enum(["weekly", "monthly", "quarterly", "semi_annual", "annual"]),
  payment_method: z.enum(["stripe", "bank_transfer", "check", "cash", "other"]),
  start_date: z.string().min(1, "Data de início obrigatória"),
  auto_renew: z.boolean().default(true),
  notes: z.string().optional(),
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
      name: opportunity?.title || "",
      description: "",
      amount: opportunity?.value || 0,
      billing_cycle: "monthly",
      payment_method: "bank_transfer",
      start_date: new Date().toISOString().split("T")[0],
      auto_renew: true,
      notes: "",
    },
  });

  // Update form when opportunity changes
  if (opportunity && form.getValues("name") !== opportunity.title) {
    form.setValue("name", opportunity.title);
    form.setValue("amount", opportunity.value);
  }

  const amount = form.watch("amount");
  const billingCycle = form.watch("billing_cycle");
  const startDate = form.watch("start_date");

  const mrr = calculateMRR(amount, billingCycle as BillingCycle);
  const nextBillingDate = startDate
    ? getNextBillingDate(new Date(startDate), billingCycle as BillingCycle)
    : null;

  const onSubmit = async (values: FormValues) => {
    if (!opportunity) return;

    await convertToSubscription.mutateAsync({
      opportunityId: opportunity.id,
      subscriptionData: {
        name: values.name,
        description: values.description,
        amount: values.amount,
        billing_cycle: values.billing_cycle as BillingCycle,
        payment_method: values.payment_method as PaymentMethodType,
        start_date: values.start_date,
        auto_renew: values.auto_renew,
        notes: values.notes,
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Subscrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor por Ciclo (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billing_cycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de Cobrança</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
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
                <span className="text-sm text-muted-foreground">MRR Estimado</span>
                <span className="font-semibold text-primary">{formatCurrency(mrr)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">ARR Estimado</span>
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
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pagamento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
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

            {nextBillingDate && (
              <p className="text-sm text-muted-foreground">
                Primeira cobrança: {nextBillingDate.toLocaleDateString("pt-PT")}
              </p>
            )}

            <FormField
              control={form.control}
              name="auto_renew"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Renovação Automática</FormLabel>
                    <FormDescription>
                      A subscrição será renovada automaticamente.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas sobre o contrato..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Converter em Subscrição
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
