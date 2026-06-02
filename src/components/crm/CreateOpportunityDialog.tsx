import { useRef, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useLeads } from "@/hooks/useLeads";
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

const opportunitySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  lead_id: z.string().optional(),
  value: z.coerce.number().min(0, "Value must be positive").default(0),
  stage_id: z.string().min(1, "Stage is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
}: CreateOpportunityDialogProps) {
  const createOpportunity = useCreateOpportunity();
  const { data: stages } = usePipelineStages();
  const { data: leads } = useLeads();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);

  const leadOptions = useMemo(
    () =>
      (leads || []).map((l: any) => ({
        id: l.id,
        label: l.name || l.company_name || "—",
        company: l.company_name || "",
        email: l.email || "",
      })),
    [leads],
  );

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      lead_id: "",
      value: 0,
      stage_id: "",
    },
  });

  const onSubmit = async (values: OpportunityFormValues) => {
    try {
      const result = await createOpportunity.mutateAsync({
        title: values.title,
        lead_id: values.lead_id || undefined,
        value: values.value,
        stage_id: values.stage_id,
      });

      if (result?.id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields(result.id);
      }

      toast.success("Opportunity created successfully");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create opportunity");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Opportunity</DialogTitle>
          <DialogDescription>
            Create a new opportunity to track in your pipeline.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="New Enterprise Deal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => {
                const selected = leadOptions.find((o) => o.id === field.value);
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Contacto / Empresa</FormLabel>
                    <Popover open={leadPickerOpen} onOpenChange={setLeadPickerOpen}>
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
                            {selected
                              ? selected.label + (selected.company && selected.company !== selected.label ? ` — ${selected.company}` : "")
                              : "Pesquisar contacto ou empresa..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command
                          filter={(value, search) => {
                            const v = value.toLowerCase();
                            const s = search.toLowerCase().trim();
                            return v.includes(s) ? 1 : 0;
                          }}
                        >
                          <CommandInput placeholder="Pesquisar por nome, empresa ou email..." />
                          <CommandList>
                            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__sem-lead__"
                                onSelect={() => {
                                  field.onChange(undefined);
                                  setLeadPickerOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                Sem lead associado
                              </CommandItem>
                              {leadOptions.map((opt) => (
                                <CommandItem
                                  key={opt.id}
                                  value={`${opt.label} ${opt.company} ${opt.email}`}
                                  onSelect={() => {
                                    field.onChange(opt.id);
                                    setLeadPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === opt.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate">{opt.label}</span>
                                    {(opt.company || opt.email) && (
                                      <span className="text-xs text-muted-foreground truncate">
                                        {[opt.company, opt.email].filter(Boolean).join(" · ")}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
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
                  <FormLabel>Stage *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
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
                Cancel
              </Button>
              <Button type="submit" disabled={createOpportunity.isPending}>
                {createOpportunity.isPending ? "Creating..." : "Create Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
