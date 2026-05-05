import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import { useCreateLeadChefActivity } from "@/hooks/leadchef/useCreateLeadChefActivity";
import { useUpdateLeadChefNextAction } from "@/hooks/leadchef/useUpdateLeadChefNextAction";
import { useUpdateLeadChefLeadStage } from "@/hooks/leadchef/useUpdateLeadChefLeadStage";
import type { LeadChefActivityType, LeadChefStage } from "@/types/leadchef";

const TYPES: LeadChefActivityType[] = [
  "phone_call",
  "whatsapp",
  "follow_up",
  "demo",
  "proposal",
  "post_sale_visit",
  "cooking_class",
  "custom_visit",
  "referral",
  "note",
];

const schema = z.object({
  type: z.string().min(1),
  title: z.string().min(1, "Título obrigatório.").max(200),
  scheduled_at: z.string().optional(),
  note: z.string().max(2000).optional(),
  setAsNextAction: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  profileId: string;
  defaultType?: LeadChefActivityType;
  /**
   * Quando true, ao gravar atualiza também a stage para demo_scheduled.
   */
  forceStage?: LeadChefStage;
  title?: string;
}

export function LeadChefCreateActionSheet({
  open,
  onOpenChange,
  leadId,
  profileId,
  defaultType = "follow_up",
  forceStage,
  title,
}: Props) {
  const create = useCreateLeadChefActivity();
  const updateNext = useUpdateLeadChefNextAction();
  const updateStage = useUpdateLeadChefLeadStage();
  const [setAsNext, setSetAsNext] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, title: "", note: "" },
  });

  const typeValue = watch("type");

  useEffect(() => {
    if (open) {
      reset({ type: defaultType, title: "", note: "" });
      setSetAsNext(true);
    }
  }, [open, defaultType, reset]);

  const onSubmit = async (values: FormValues) => {
    const scheduledIso = values.scheduled_at
      ? new Date(values.scheduled_at).toISOString()
      : null;

    await create.mutateAsync({
      leadId,
      type: values.type as LeadChefActivityType,
      title: values.title,
      description: values.note || undefined,
      metadata: scheduledIso ? { scheduled_at: scheduledIso } : {},
    });

    if (setAsNext && scheduledIso) {
      await updateNext.mutateAsync({
        profileId,
        next_action_type: values.type as LeadChefActivityType,
        next_action_at: scheduledIso,
        next_action_note: values.note || null,
      });
    }

    if (forceStage) {
      await updateStage.mutateAsync({ profileId, leadId, stage: forceStage });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title ?? "Nova ação"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Label>Tipo</Label>
            <Select
              value={typeValue}
              onValueChange={(v) => setValue("type", v as LeadChefActivityType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEADCHEF_ACTIVITY_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input
              {...register("title")}
              placeholder="Ex.: Demonstração em casa"
            />
            {errors.title && (
              <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label>Data e hora</Label>
            <Input type="datetime-local" {...register("scheduled_at")} />
          </div>

          <div>
            <Label>Nota</Label>
            <Textarea
              {...register("note")}
              placeholder="Detalhes, local, observações…"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={setAsNext}
              onChange={(e) => setSetAsNext(e.target.checked)}
              className="rounded border-slate-300"
            />
            Definir como próxima ação do lead
          </label>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={create.isPending}
            >
              Guardar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
