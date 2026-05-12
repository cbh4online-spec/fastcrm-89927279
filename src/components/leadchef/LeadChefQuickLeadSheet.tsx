import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateLeadChefLead } from "@/hooks/leadchef/useCreateLeadChefLead";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import type { LeadChefActivityType, LeadChefTemperature } from "@/types/leadchef";
import {
  isValidPortugalPostalCode,
  lookupPortugalPostalCode,
} from "@/utils/leadchef/postalCode";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Indica o nome do lead.").max(120),
  phone: z.string().min(6, "Telefone obrigatório.").max(40),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  origin: z.string().min(2, "Origem obrigatória.").max(60),
  interest: z.string().min(2, "Interesse obrigatório.").max(120),
  nextActionType: z.string().optional(),
  nextActionAt: z.string().optional(),
  nextActionNote: z.string().max(300).optional(),
  temperature: z.enum(["cold", "warm", "hot"]),
  notes: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  addressNumber: z.string().max(20).optional(),
  addressFloor: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (leadId: string) => void;
}

const ORIGIN_OPTIONS = [
  "Instagram", "WhatsApp", "Facebook", "Indicação", "Demonstração",
  "Loja", "Site", "Anúncio", "Evento", "Outro",
];

const ACTIVITY_OPTIONS: LeadChefActivityType[] = [
  "phone_call", "whatsapp", "follow_up", "demo", "post_sale_visit",
];

export function LeadChefQuickLeadSheet({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateLeadChefLead();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpCp, setIsLookingUpCp] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      origin: "",
      interest: "",
      nextActionType: "phone_call",
      nextActionAt: "",
      nextActionNote: "",
      temperature: "warm",
      notes: "",
      address: "",
      addressNumber: "",
      addressFloor: "",
      city: "",
      postalCode: "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await create.mutateAsync({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        origin: values.origin,
        interest: values.interest,
        nextActionType: (values.nextActionType as LeadChefActivityType) || undefined,
        nextActionAt: values.nextActionAt
          ? new Date(values.nextActionAt).toISOString()
          : null,
        nextActionNote: values.nextActionNote,
        temperature: values.temperature as LeadChefTemperature,
        notes: values.notes,
        address: values.address || undefined,
        city: values.city || undefined,
        postalCode: values.postalCode || undefined,
      });
      form.reset();
      onOpenChange(false);
      onCreated?.(result.leadId);
    } catch {
      // toast já é mostrado no hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Nova referência LeadChef</SheetTitle>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 mt-4 pb-4">
          <div className="space-y-1">
            <Label htmlFor="lc-name">Nome *</Label>
            <Input id="lc-name" autoFocus {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lc-phone">Telefone / WhatsApp *</Label>
              <Input id="lc-phone" type="tel" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lc-email">Email</Label>
              <Input id="lc-email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Origem *</Label>
              <Select
                value={form.watch("origin")}
                onValueChange={(v) => form.setValue("origin", v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  {ORIGIN_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.origin && (
                <p className="text-xs text-destructive">{form.formState.errors.origin.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lc-interest">Interesse *</Label>
              <Input id="lc-interest" placeholder="Ex.: Demonstração" {...form.register("interest")} />
              {form.formState.errors.interest && (
                <p className="text-xs text-destructive">{form.formState.errors.interest.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Próxima ação</Label>
              <Select
                value={form.watch("nextActionType")}
                onValueChange={(v) => form.setValue("nextActionType", v)}
              >
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{LEADCHEF_ACTIVITY_LABELS[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lc-next-at">Data/hora</Label>
              <Input id="lc-next-at" type="datetime-local" {...form.register("nextActionAt")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Interesse</Label>
            <Select
              value={form.watch("temperature")}
              onValueChange={(v) => form.setValue("temperature", v as LeadChefTemperature)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">Frio</SelectItem>
                <SelectItem value="warm">Morno</SelectItem>
                <SelectItem value="hot">Quente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lc-address">Morada</Label>
            <Input id="lc-address" placeholder="Rua, número, andar" {...form.register("address")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lc-postal">
                Código postal
                {isLookingUpCp && (
                  <Loader2 className="inline h-3 w-3 ml-2 animate-spin text-emerald-600" />
                )}
              </Label>
              <Input
                id="lc-postal"
                placeholder="0000-000"
                {...form.register("postalCode")}
                onBlur={async (e) => {
                  const cp = e.target.value.trim();
                  if (!isValidPortugalPostalCode(cp)) return;
                  setIsLookingUpCp(true);
                  try {
                    const result = await lookupPortugalPostalCode(cp);
                    if (!result) {
                      toast.error("Código postal não encontrado.");
                      return;
                    }
                    if (result.address && !form.getValues("address")) {
                      form.setValue("address", result.address, { shouldDirty: true });
                    }
                    if (result.city) {
                      form.setValue("city", result.city, { shouldDirty: true });
                    }
                  } catch {
                    toast.error("Falha ao consultar código postal.");
                  } finally {
                    setIsLookingUpCp(false);
                  }
                }}
              />
              <p className="text-[11px] text-slate-500">
                Indica o código postal e a morada/localidade são preenchidas automaticamente.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lc-city">Localidade</Label>
              <Input id="lc-city" placeholder="Cidade" {...form.register("city")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lc-note">Notas</Label>
            <Textarea id="lc-note" rows={2} {...form.register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button" variant="outline" className="flex-1"
              onClick={() => onOpenChange(false)} disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar lead
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
