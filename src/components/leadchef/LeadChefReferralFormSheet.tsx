import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateLeadChefReferral } from "@/hooks/leadchef/useCreateLeadChefReferral";
import { useLeadChefClients } from "@/hooks/leadchef/useLeadChefClients";
import { LEADCHEF_AUTHORIZATION_STATUSES, LEADCHEF_AUTHORIZATION_STATUS_LABELS } from "./constants";
import { LEADCHEF_DEVICE_BRANDS } from "@/config/leadchef/devices";
import type { LeadChefAuthorizationStatus } from "@/types/leadchef";

const schema = z.object({
  name: z.string().min(2, "Indica o nome.").max(120),
  phone: z.string().max(40).optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  authorization_status: z.enum(["unknown", "granted", "denied"]),
  context: z.string().max(300).optional(),
  interest: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  device_brand: z.string().max(60).optional(),
  device_model: z.string().max(60).optional(),
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(referrerLeadId ?? null);

  // Carregar clientes (leads ganhos) para escolher quem indicou.
  // Só ativa o fetch quando não há referrer pré-definido e o sheet está aberto.
  const lockedReferrer = !!referrerLeadId;
  const { data: clients, isLoading: loadingClients } = useLeadChefClients();

  const selectedClient = useMemo(() => {
    if (!selectedReferrerId) return null;
    return clients?.find((c) => c.leadId === selectedReferrerId) ?? null;
  }, [clients, selectedReferrerId]);

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
      device_brand: "",
      device_model: "",
    },
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      const r = await create.mutateAsync({
        name: v.name,
        phone: v.phone,
        email: v.email,
        referred_by_lead_id: selectedReferrerId || null,
        authorization_status: v.authorization_status as LeadChefAuthorizationStatus,
        context: v.context,
        interest: v.interest,
        notes: v.notes,
        device_brand: v.device_brand,
        device_model: v.device_model,
      });
      form.reset();
      setSelectedReferrerId(referrerLeadId ?? null);
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
          {/* Cliente que indicou */}
          <div className="space-y-1">
            <Label>Indicada por (cliente)</Label>
            {lockedReferrer ? (
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {referrerName ?? "Cliente atual"}
              </div>
            ) : (
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className={cn("truncate", !selectedClient && "text-muted-foreground")}>
                      {selectedClient ? selectedClient.name : "Selecionar cliente que indicou…"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedClient && (
                        <X
                          className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReferrerId(null);
                          }}
                        />
                      )}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar cliente…" />
                    <CommandList>
                      {loadingClients ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">A carregar…</div>
                      ) : (
                        <>
                          <CommandEmpty>Sem clientes encontrados.</CommandEmpty>
                          <CommandGroup>
                            {(clients ?? []).map((c) => (
                              <CommandItem
                                key={c.leadId}
                                value={`${c.name} ${c.phone ?? ""} ${c.email ?? ""}`}
                                onSelect={() => {
                                  setSelectedReferrerId(c.leadId);
                                  setPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedReferrerId === c.leadId ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm truncate">{c.name}</div>
                                  {(c.phone || c.email) && (
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {c.phone || c.email}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <p className="text-[11px] text-muted-foreground">
              Liga esta referência ao cliente que a indicou. Aparece no histórico do cliente.
            </p>
          </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Equipamento atual — marca</Label>
              <Select
                value={form.watch("device_brand") || ""}
                onValueChange={(v) => form.setValue("device_brand", v, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue placeholder="Ex.: Bimby" /></SelectTrigger>
                <SelectContent>
                  {LEADCHEF_DEVICE_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref-device-model">Modelo</Label>
              <Input id="ref-device-model" placeholder="Ex.: TM6, TM7" {...form.register("device_model")} />
            </div>
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
