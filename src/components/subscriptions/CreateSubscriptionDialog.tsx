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
import { Loader2 } from "lucide-react";
import { useCreateSubscription } from "@/hooks/useSubscriptions";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import {
  BILLING_FREQUENCY_LABELS,
  PAYMENT_PROVIDER_LABELS,
  getNextBillingDate,
} from "@/types/subscription";
import type { BillingFrequency, PaymentProvider } from "@/types/subscription";

const formSchema = z.object({
  customer_type: z.enum(["contact", "company"]),
  customer_id: z.string().min(1, "Cliente obrigatório"),
  mrr_amount: z.coerce.number().min(0, "Valor deve ser positivo"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "semi_annual", "yearly"]),
  provider: z.enum(["stripe", "manual", "other"]),
  start_date: z.string().min(1, "Data de início obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContactId?: string;
  defaultCompanyId?: string;
  opportunityId?: string;
  opportunityValue?: number;
  onSuccess?: () => void;
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  defaultContactId,
  defaultCompanyId,
  opportunityId,
  opportunityValue,
  onSuccess,
}: CreateSubscriptionDialogProps) {
  const createSubscription = useCreateSubscription();
  const { contacts = [] } = useContacts();
  const { companies = [] } = useCompanies();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_type: defaultCompanyId ? "company" : "contact",
      customer_id: defaultCompanyId || defaultContactId || "",
      mrr_amount: opportunityValue || 0,
      frequency: "monthly",
      provider: "manual",
      start_date: new Date().toISOString().split("T")[0],
    },
  });

  const customerType = form.watch("customer_type");
  const startDate = form.watch("start_date");
  const frequency = form.watch("frequency");

  const nextPaymentDate = startDate
    ? getNextBillingDate(new Date(startDate), frequency as BillingFrequency)
    : null;

  const onSubmit = async (values: FormValues) => {
    const subscriptionData = {
      contact_id: values.customer_type === "contact" ? values.customer_id : undefined,
      company_id: values.customer_type === "company" ? values.customer_id : undefined,
      opportunity_id: opportunityId,
      mrr_amount: values.mrr_amount,
      frequency: values.frequency as BillingFrequency,
      provider: values.provider as PaymentProvider,
      start_date: values.start_date,
      next_payment_date: nextPaymentDate?.toISOString().split("T")[0],
      status: "active" as const,
    };

    await createSubscription.mutateAsync(subscriptionData);
    onOpenChange(false);
    form.reset();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Subscrição</DialogTitle>
          <DialogDescription>
            Crie uma subscrição recorrente para um cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("customer_id", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contact">Contacto</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customerType === "contact"
                          ? contacts.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))
                          : companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                Próximo pagamento: {nextPaymentDate.toLocaleDateString("pt-PT")}
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
              <Button type="submit" disabled={createSubscription.isPending}>
                {createSubscription.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar Subscrição
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
