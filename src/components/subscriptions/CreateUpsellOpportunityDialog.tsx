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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, TrendingUp, Copy } from "lucide-react";
import { format, addMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import type { Subscription } from "@/types/subscription";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.number().min(0, "Valor deve ser positivo"),
  stage_id: z.string().min(1, "Selecione uma etapa"),
  expected_close_date: z.date().optional(),
  notes: z.string().optional(),
  upsell_type: z.enum(["upgrade", "cross_sell", "renewal_renegotiation"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateUpsellOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  originalOpportunityId?: string;
  onSuccess?: (opportunityId: string) => void;
}

export function CreateUpsellOpportunityDialog({
  open,
  onOpenChange,
  subscription,
  originalOpportunityId,
  onSuccess,
}: CreateUpsellOpportunityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createOpportunity = useCreateOpportunity();
  const { data: stages = [] } = usePipelineStages();
  const { workspaceClient } = useWorkspaceInstance();

  // Get first stage as default
  const defaultStageId = stages.length > 0 ? stages[0].id : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: `Upsell - ${subscription.company?.name || subscription.contact?.name || "Cliente"}`,
      value: subscription.mrr_amount * 12 * 0.2, // Suggest 20% increase as default
      stage_id: defaultStageId,
      expected_close_date: addMonths(new Date(), 1),
      notes: "",
      upsell_type: "upgrade",
    },
  });

  // Update stage_id when stages load
  if (stages.length > 0 && !form.getValues("stage_id")) {
    form.setValue("stage_id", stages[0].id);
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Create the upsell opportunity
      const newOpportunity = await createOpportunity.mutateAsync({
        title: values.title,
        value: values.value,
        stage_id: values.stage_id,
        lead_id: subscription.contact_id || undefined,
        expected_close_date: values.expected_close_date?.toISOString(),
        notes: values.notes,
        status: "open",
      });

      // Link to original opportunity if exists
      if (originalOpportunityId && workspaceClient) {
        // Store upsell relationship in metadata or notes
        await workspaceClient
          .from("opportunities")
          .update({
            notes: `${values.notes || ""}\n\n[Upsell da oportunidade original: ${originalOpportunityId}]\n[Tipo: ${values.upsell_type}]\n[Subscrição: ${subscription.id}]`,
          })
          .eq("id", newOpportunity.id);
      }

      toast.success("Oportunidade de upsell criada");
      onOpenChange(false);
      form.reset();
      onSuccess?.(newOpportunity.id);
    } catch (error) {
      console.error("Error creating upsell opportunity:", error);
      toast.error("Erro ao criar oportunidade");
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

  const upsellTypeLabels = {
    upgrade: "Upgrade de Plano",
    cross_sell: "Venda Cruzada",
    renewal_renegotiation: "Renegociação de Renovação",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Criar Oportunidade de Upsell
          </DialogTitle>
          <DialogDescription>
            Criar uma nova oportunidade vinculada à subscrição de{" "}
            {subscription.company?.name || subscription.contact?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Current Subscription Info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Copy className="h-3 w-3" />
              Subscrição Atual
            </div>
            <p className="font-medium">
              {formatCurrency(subscription.mrr_amount)}/mês (MRR)
            </p>
            <p className="text-xs text-muted-foreground">
              ARR: {formatCurrency(subscription.mrr_amount * 12)}
            </p>
          </div>

          {/* Upsell Type */}
          <div className="space-y-2">
            <Label>Tipo de Upsell *</Label>
            <Select
              value={form.watch("upsell_type")}
              onValueChange={(v) => form.setValue("upsell_type", v as FormValues["upsell_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(upsellTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor da Oportunidade (€) *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              {...form.register("value", { valueAsNumber: true })}
            />
            {form.formState.errors.value && (
              <p className="text-xs text-destructive">
                {form.formState.errors.value.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Sugestão: aumento de 20% = {formatCurrency(subscription.mrr_amount * 12 * 0.2)}
            </p>
          </div>

          {/* Pipeline Stage */}
          <div className="space-y-2">
            <Label>Etapa do Pipeline *</Label>
            <Select
              value={form.watch("stage_id")}
              onValueChange={(v) => form.setValue("stage_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.stage_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.stage_id.message}
              </p>
            )}
          </div>

          {/* Expected Close Date */}
          <div className="space-y-2">
            <Label>Previsão de Fecho</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("expected_close_date") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("expected_close_date") ? (
                    format(form.watch("expected_close_date")!, "PPP", { locale: pt })
                  ) : (
                    <span>Selecionar data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("expected_close_date")}
                  onSelect={(date) => form.setValue("expected_close_date", date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a oportunidade de upsell..."
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
              Criar Oportunidade
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
