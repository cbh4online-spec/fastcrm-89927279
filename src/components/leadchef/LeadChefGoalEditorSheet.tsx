import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useUpsertLeadChefGoal } from "@/hooks/leadchef/useUpsertLeadChefGoal";
import { formatMonthPt } from "@/utils/leadchef/goals";
import type { LeadChefGoal } from "@/types/leadchef";

const numField = z.coerce.number({ invalid_type_error: "Número inválido." }).min(0, "Não pode ser negativo.").default(0);

const schema = z.object({
  leads_goal: numField,
  contacts_goal: numField,
  demos_goal: numField,
  sales_goal: numField,
  referrals_goal: numField,
  recruitment_goal: numField,
  income_goal: numField,
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodMonth: string;
  current?: LeadChefGoal | null;
}

export function LeadChefGoalEditorSheet({ open, onOpenChange, periodMonth, current }: Props) {
  const upsert = useUpsertLeadChefGoal();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      leads_goal: current?.leads_goal ?? 0,
      contacts_goal: current?.contacts_goal ?? 0,
      demos_goal: current?.demos_goal ?? 0,
      sales_goal: current?.sales_goal ?? 0,
      referrals_goal: current?.referrals_goal ?? 0,
      recruitment_goal: current?.recruitment_goal ?? 0,
      income_goal: current?.income_goal ?? 0,
      notes: current?.notes ?? "",
    },
    values: {
      leads_goal: current?.leads_goal ?? 0,
      contacts_goal: current?.contacts_goal ?? 0,
      demos_goal: current?.demos_goal ?? 0,
      sales_goal: current?.sales_goal ?? 0,
      referrals_goal: current?.referrals_goal ?? 0,
      recruitment_goal: current?.recruitment_goal ?? 0,
      income_goal: current?.income_goal ?? 0,
      notes: current?.notes ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await upsert.mutateAsync({ period_month: periodMonth, ...values, notes: values.notes || null });
      onOpenChange(false);
    } catch {
      // toast já no hook
    } finally {
      setSubmitting(false);
    }
  };

  const NumberInput = (id: keyof FormValues, label: string, hint?: string) => (
    <div className="space-y-1">
      <Label htmlFor={`goal-${id}`}>{label}</Label>
      <Input
        id={`goal-${id}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={id === "income_goal" ? "0.01" : "1"}
        className="h-12 text-lg font-semibold"
        {...form.register(id, { valueAsNumber: true })}
      />
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {form.formState.errors[id] && (
        <p className="text-xs text-destructive">{(form.formState.errors[id] as any)?.message}</p>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Objetivos · {formatMonthPt(periodMonth)}</SheetTitle>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {NumberInput("leads_goal", "Leads novos")}
            {NumberInput("contacts_goal", "Contactos")}
            {NumberInput("demos_goal", "Demonstrações")}
            {NumberInput("sales_goal", "Vendas")}
            {NumberInput("referrals_goal", "Referências")}
            {NumberInput("recruitment_goal", "Recrutamentos")}
          </div>
          {NumberInput("income_goal", "Rendimento estimado (€)", "Valor objetivo a faturar este mês.")}

          <div className="space-y-1">
            <Label htmlFor="goal-notes">Notas</Label>
            <Textarea id="goal-notes" rows={2} placeholder="Ex.: Foco em demos presenciais." {...form.register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar objetivos
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
