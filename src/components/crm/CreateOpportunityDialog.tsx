import { useEffect, useRef, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown, User, Building2, Sparkles } from "lucide-react";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";

type EntityKind = "lead" | "contact" | "company";
type EntityRef = `${EntityKind}:${string}`;

const opportunitySchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(120),
  entity_ref: z.string().optional(),
  value: z.coerce.number().min(0, "Valor tem de ser positivo").default(0),
  stage_id: z.string().min(1, "Etapa obrigatória"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-associar a oportunidade a uma entidade */
  prefill?: {
    entityType?: EntityKind;
    entityId?: string;
    entityName?: string;
  };
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
  prefill,
}: CreateOpportunityDialogProps) {
  const createOpportunity = useCreateOpportunity();
  const { data: stages } = usePipelineStages();
  const { data: leads } = useLeads();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  type Option = {
    ref: EntityRef;
    kind: EntityKind;
    id: string;
    label: string;
    sub?: string;
    email?: string;
  };

  const options = useMemo<Option[]>(() => {
    const list: Option[] = [];
    (companies || []).forEach((c: any) => {
      list.push({
        ref: `company:${c.id}` as EntityRef,
        kind: "company",
        id: c.id,
        label: c.name || "—",
        sub: c.industry || c.website || "",
      });
    });
    (contacts || []).forEach((c: any) => {
      list.push({
        ref: `contact:${c.id}` as EntityRef,
        kind: "contact",
        id: c.id,
        label: c.name || "—",
        sub: c.company || c.job_title || "",
        email: c.email || "",
      });
    });
    (leads || []).forEach((l: any) => {
      list.push({
        ref: `lead:${l.id}` as EntityRef,
        kind: "lead",
        id: l.id,
        label: l.name || l.company_name || "—",
        sub: l.company_name || "",
        email: l.email || "",
      });
    });
    return list;
  }, [leads, contacts, companies]);

  const prefillRef: EntityRef | undefined =
    prefill?.entityType && prefill?.entityId
      ? (`${prefill.entityType}:${prefill.entityId}` as EntityRef)
      : undefined;

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      entity_ref: prefillRef ?? "",
      value: 0,
      stage_id: "",
    },
  });

  // Re-inicializar quando abrir com contexto diferente
  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        entity_ref: prefillRef ?? "",
        value: 0,
        stage_id: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillRef]);

  const onSubmit = async (values: OpportunityFormValues) => {
    try {
      const [kind, id] = (values.entity_ref || "").split(":") as [EntityKind | "", string];
      const result = await createOpportunity.mutateAsync({
        title: values.title,
        lead_id: kind === "lead" ? id : undefined,
        contact_id: kind === "contact" ? id : undefined,
        company_id: kind === "company" ? id : undefined,
        value: values.value,
        stage_id: values.stage_id,
      });

      if (result?.id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields(result.id);
      }

      toast.success("Oportunidade criada com sucesso");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao criar oportunidade");
    }
  };

  const kindIcon = (k: EntityKind) =>
    k === "company" ? Building2 : k === "contact" ? User : Sparkles;

  const kindLabel = (k: EntityKind) =>
    k === "company" ? "Empresa" : k === "contact" ? "Contacto" : "Lead";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
          <DialogDescription>
            Cria uma oportunidade e associa-a a um contacto, empresa ou lead.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Renovação anual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entity_ref"
              render={({ field }) => {
                const selected = options.find((o) => o.ref === field.value);
                const Icon = selected ? kindIcon(selected.kind) : ChevronsUpDown;
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Contacto / Empresa / Lead</FormLabel>
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2 min-w-0 truncate">
                              <Icon className="h-4 w-4 shrink-0 opacity-70" />
                              <span className="truncate">
                                {selected
                                  ? `${selected.label}${selected.sub ? ` — ${selected.sub}` : ""}`
                                  : "Pesquisar contacto, empresa ou lead…"}
                              </span>
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command
                          filter={(value, search) => {
                            const v = value.toLowerCase();
                            const s = search.toLowerCase().trim();
                            if (!s) return 1;
                            return v.includes(s) ? 1 : 0;
                          }}
                        >
                          <CommandInput placeholder="Pesquisar por nome, empresa ou email…" />
                          <CommandList>
                            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__sem-associacao__"
                                onSelect={() => {
                                  field.onChange("");
                                  setPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !field.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                Sem associação
                              </CommandItem>
                            </CommandGroup>
                            {(["company", "contact", "lead"] as EntityKind[]).map((kind) => {
                              const group = options.filter((o) => o.kind === kind);
                              if (group.length === 0) return null;
                              return (
                                <CommandGroup key={kind} heading={kindLabel(kind) + "s"}>
                                  {group.map((opt) => {
                                    const KindIcon = kindIcon(opt.kind);
                                    return (
                                      <CommandItem
                                        key={opt.ref}
                                        value={`${opt.label} ${opt.sub ?? ""} ${opt.email ?? ""}`}
                                        onSelect={() => {
                                          field.onChange(opt.ref);
                                          setPickerOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === opt.ref ? "opacity-100" : "opacity-0",
                                          )}
                                        />
                                        <KindIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                                        <div className="flex flex-col min-w-0">
                                          <span className="truncate">{opt.label}</span>
                                          {(opt.sub || opt.email) && (
                                            <span className="text-xs text-muted-foreground truncate">
                                              {[opt.sub, opt.email].filter(Boolean).join(" · ")}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              );
                            })}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stage_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etapa *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar etapa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages?.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fields */}
            <CustomFieldsFormCreate
              ref={customFieldsRef}
              entityType="opportunity"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createOpportunity.isPending}>
                {createOpportunity.isPending ? "A criar…" : "Criar oportunidade"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
