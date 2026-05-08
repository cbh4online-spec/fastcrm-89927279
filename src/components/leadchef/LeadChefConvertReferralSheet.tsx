import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";
import { useConvertLeadChefReferralToLead } from "@/hooks/leadchef/useConvertLeadChefReferralToLead";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import type { LeadChefActivityType, LeadChefReferral, LeadChefTemperature } from "@/types/leadchef";

const ACTIVITY_OPTIONS: LeadChefActivityType[] = ["phone_call", "whatsapp", "follow_up", "demo"];

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().optional(),
  interest: z.string().optional(),
  origin: z.string().optional(),
  temperature: z.enum(["cold", "warm", "hot"]),
  nextActionType: z.string().optional(),
  nextActionAt: z.string().optional(),
  nextActionNote: z.string().optional(),
  authConfirmed: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: LeadChefReferral | null;
  onConverted?: (leadId: string) => void;
}

export function LeadChefConvertReferralSheet({ open, onOpenChange, referral, onConverted }: Props) {
  const convert = useConvertLeadChefReferralToLead();
  const [submitting, setSubmitting] = useState(false);
  const needsConfirm = referral && referral.authorization_status !== "granted";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: referral?.name ?? "",
      phone: referral?.phone ?? "",
      email: referral?.email ?? "",
      interest: "",
      origin: "Referência",
      temperature: "warm",
      nextActionType: "phone_call",
      nextActionAt: "",
      nextActionNote: "",
      authConfirmed: false,
    },
    values: referral ? {
      name: referral.name,
      phone: referral.phone ?? "",
      email: referral.email ?? "",
      interest: "",
      origin: "Referência",
      temperature: "warm",
      nextActionType: "phone_call",
      nextActionAt: "",
      nextActionNote: "",
      authConfirmed: false,
    } : undefined,
  });

  const onSubmit = async (v: FormValues) => {
    if (!referral) return;
    setSubmitting(true);
    try {
      const r = await convert.mutateAsync({
        referral,
        name: v.name,
        phone: v.phone,
        email: v.email,
        interest: v.interest,
        origin: v.origin || "Referência",
        temperature: v.temperature as LeadChefTemperature,
        nextActionType: (v.nextActionType as LeadChefActivityType) || "phone_call",
        nextActionAt: v.nextActionAt ? new Date(v.nextActionAt).toISOString() : null,
        nextActionNote: v.nextActionNote,
        authorizationConfirmed: !!v.authConfirmed || referral.authorization_status === "granted",
      });
      onOpenChange(false);
      onConverted?.(r.leadId);
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Converter referência em lead</SheetTitle>
        </SheetHeader>
        {!referral ? (
          <p className="text-sm text-slate-500 mt-4">Sem referência selecionada.</p>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-4 pb-4">
            {needsConfirm && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Sem autorização confirmada</p>
                  <p className="mt-0.5">Confirma que tens autorização da pessoa para ser contactada.</p>
                  <label className="mt-2 inline-flex items-center gap-2 text-amber-900">
                    <Checkbox
                      checked={!!form.watch("authConfirmed")}
                      onCheckedChange={(v) => form.setValue("authConfirmed", !!v)}
                    />
                    <span>Confirmo a autorização para contacto.</span>
                  </label>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="cref-name">Nome *</Label>
              <Input id="cref-name" {...form.register("name")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input type="tel" {...form.register("phone")} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Origem</Label>
                <Input {...form.register("origin")} />
              </div>
              <div className="space-y-1">
                <Label>Interesse</Label>
                <Input {...form.register("interest")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Próxima ação</Label>
                <Select value={form.watch("nextActionType")} onValueChange={(v) => form.setValue("nextActionType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>{LEADCHEF_ACTIVITY_LABELS[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data/hora</Label>
                <Input type="datetime-local" {...form.register("nextActionAt")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas para próxima ação</Label>
              <Textarea rows={2} {...form.register("nextActionNote")} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={submitting || (needsConfirm && !form.watch("authConfirmed"))}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Converter em lead
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
