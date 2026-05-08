import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateLeadChefReferral } from "@/hooks/leadchef/useCreateLeadChefReferral";
import { LEADCHEF_AUTHORIZATION_STATUSES, LEADCHEF_AUTHORIZATION_STATUS_LABELS } from "./constants";
import type { LeadChefAuthorizationStatus } from "@/types/leadchef";

const schema = z.object({
  name: z.string().min(2, "Indica o nome.").max(120),
  phone: z.string().max(40).optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  authorization_status: z.enum(["unknown", "granted", "denied"]),
  context: z.string().max(300).optional(),
  interest: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrerLeadId?: string | null;
  referrerName?: string | null;
  onCreated?: (referralId: string) => void;
}

export function LeadChefReferralFormSheet({ open, onOpenChange, referrerLeadId, referrerName, onCreated }: Props) {
  const create = useCreateLeadChefReferral();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      authorization_status: "unknown",
      context: "",
      interest: "",
      notes: "",
    },
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      const r = await create.mutateAsync({
        name: v.name,
        phone: v.phone,
        email: v.email,
        referred_by_lead_id: referrerLeadId || null,
        authorization_status: v.authorization_status as LeadChefAuthorizationStatus,
        context: v.context,
        interest: v.interest,
        notes: v.notes,
      });
      form.reset();
      onOpenChange(false);
      onCreated?.(r.id);
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Nova referência{referrerName ? ` · ${referrerName}` : ""}</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-4 pb-4">
          <div className="space-y-1">
            <Label htmlFor="ref-name">Nome *</Label>
            <Input id="ref-name" autoFocus {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ref-phone">Telefone</Label>
              <Input id="ref-phone" type="tel" {...form.register("phone")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref-email">Email</Label>
              <Input id="ref-email" type="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Autorização para contacto</Label>
            <Select
              value={form.watch("authorization_status")}
              onValueChange={(v) => form.setValue("authorization_status", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEADCHEF_AUTHORIZATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{LEADCHEF_AUTHORIZATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-interest">Interesse provável</Label>
            <Input id="ref-interest" placeholder="Ex.: Demonstração" {...form.register("interest")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-context">Contexto da indicação</Label>
            <Textarea id="ref-context" rows={2} {...form.register("context")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-notes">Notas</Label>
            <Textarea id="ref-notes" rows={2} {...form.register("notes")} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar referência
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
