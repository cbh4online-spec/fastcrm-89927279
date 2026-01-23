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
import { Loader2 } from "lucide-react";
import { useCreateSubscription } from "@/hooks/useSubscriptions";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import {
  BILLING_CYCLE_LABELS,
  PAYMENT_METHOD_LABELS,
  getNextBillingDate,
} from "@/types/subscription";
import type { BillingCycle, PaymentMethodType, SubscriptionStatus } from "@/types/subscription";

const formSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  customer_type: z.enum(["contact", "company"]),
  customer_id: z.string().min(1, "Cliente obrigatório"),
  amount: z.coerce.number().min(0, "Valor deve ser positivo"),
  currency: z.string().default("EUR"),
  billing_cycle: z.enum(["weekly", "monthly", "quarterly", "semi_annual", "annual"]),
  payment_method: z.enum(["stripe", "bank_transfer", "check", "cash", "other"]),
  start_date: z.string().min(1, "Data de início obrigatória"),
  auto_renew: z.boolean().default(true),
  notes: z.string().optional(),
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
      name: "",
      description: "",
      customer_type: defaultCompanyId ? "company" : "contact",
      customer_id: defaultCompanyId || defaultContactId || "",
      amount: opportunityValue || 0,
      currency: "EUR",
      billing_cycle: "monthly",
      payment_method: "bank_transfer",
      start_date: new Date().toISOString().split("T")[0],
      auto_renew: true,
      notes: "",
    },
  });

  const customerType = form.watch("customer_type");
  const startDate = form.watch("start_date");
  const billingCycle = form.watch("billing_cycle");

  const nextBillingDate = startDate
    ? getNextBillingDate(new Date(startDate), billingCycle as BillingCycle)
    : null;

  const onSubmit = async (values: FormValues) => {
    const subscriptionData = {
      name: values.name,
      description: values.description,
      contact_id: values.customer_type === "contact" ? values.customer_id : undefined,
      company_id: values.customer_type === "company" ? values.customer_id : undefined,
      opportunity_id: opportunityId,
      amount: values.amount,
      currency: values.currency,
      billing_cycle: values.billing_cycle as BillingCycle,
      payment_method: values.payment_method as PaymentMethodType,
      start_date: values.start_date,
      next_billing_date: nextBillingDate?.toISOString().split("T")[0],
      auto_renew: values.auto_renew,
      notes: values.notes,
      status: "active" as SubscriptionStatus,
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Subscrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Plano Pro Mensal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes do serviço incluído..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (€)</FormLabel>
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
                Próxima cobrança: {nextBillingDate.toLocaleDateString("pt-PT")}
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
                    <Textarea placeholder="Notas internas..." {...field} />
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
