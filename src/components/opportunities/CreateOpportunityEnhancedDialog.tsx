import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOpportunityEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { OPPORTUNITY_SOURCES } from "@/types/opportunity";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";
import { Calendar, DollarSign, Users, Building2, Sparkles } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";

const opportunitySchema = z.object({
  title: z.string().min(1, "Nome é obrigatório").max(100),
  lead_id: z.string().optional(),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  value: z.coerce.number().min(0, "Valor deve ser positivo").default(0),
  currency: z.string().default("EUR"),
  stage_id: z.string().min(1, "Etapa é obrigatória"),
  probability: z.coerce.number().min(0).max(100).default(50),
  source: z.string().optional(),
  expected_close_date: z.date().optional(),
  notes: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface CreateOpportunityEnhancedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLeadId?: string;
  initialContactId?: string;
  initialCompanyId?: string;
}

export function CreateOpportunityEnhancedDialog({
  open,
  onOpenChange,
  initialLeadId,
  initialContactId,
  initialCompanyId,
}: CreateOpportunityEnhancedDialogProps) {
  const createOpportunity = useCreateOpportunityEnhanced();
  const { data: stages } = usePipelineStages();
  const { trackOpportunityCreated } = useCRMAnalytics();
  const { data: leads } = useLeads();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      lead_id: initialLeadId || "",
      contact_id: initialContactId || "",
      company_id: initialCompanyId || "",
      value: 0,
      currency: "EUR",
      stage_id: "",
      probability: 50,
      source: "",
      notes: "",
    },
  });

  // Auto-fill probability when stage changes
  const watchStageId = form.watch("stage_id");
  useEffect(() => {
    if (watchStageId && stages) {
      const stage = stages.find(s => s.id === watchStageId);
      if (stage) {
        form.setValue("probability", (stage as any).probability || 50);
      }
    }
  }, [watchStageId, stages, form]);

  // Set initial stage if available
  useEffect(() => {
    if (stages && stages.length > 0 && !form.getValues("stage_id")) {
      form.setValue("stage_id", stages[0].id);
    }
  }, [stages, form]);

  const onSubmit = async (values: OpportunityFormValues) => {
    try {
      const result = await createOpportunity.mutateAsync({
        title: values.title,
        lead_id: values.lead_id || null,
        contact_id: values.contact_id || null,
        company_id: values.company_id || null,
        value: values.value,
        currency: values.currency,
        stage_id: values.stage_id,
        probability: values.probability,
        source: values.source || undefined,
        expected_close_date: values.expected_close_date?.toISOString().split("T")[0],
        notes: values.notes,
      });
      
      // Save custom fields if any
      if (result?.id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields(result.id);
      }
      
      trackOpportunityCreated({ value: values.value, origin: 'manual' });
      toast.success("Oportunidade criada com sucesso");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao criar oportunidade");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Nova Oportunidade
          </DialogTitle>
          <DialogDescription>
            Crie uma nova oportunidade para acompanhar no seu pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="relations">Relações</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Oportunidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Proposta Website Empresa X" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (€)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="5000"
                              min={0}
                              className="pl-9"
                              {...field}
                            />
                          </div>
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
                              <SelectValue placeholder="Selecione uma etapa" />
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
                                  {stage.name} ({(stage as any).probability || 50}%)
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidade de Fecho: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          min={0}
                          max={100}
                          step={5}
                          className="py-4"
                        />
                      </FormControl>
                      <FormDescription>
                        Ajusta-se automaticamente com base na etapa selecionada
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_close_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Prevista de Fecho</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: pt })
                              ) : (
                                <span>Selecionar data</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="relations" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="lead_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Lead Associado
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar lead (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {leads?.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.name} {lead.email && `(${lead.email})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Contacto Associado
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar contacto (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {contacts?.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name} {contact.email && `(${contact.email})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Empresa Associada
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar empresa (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {companies?.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar origem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_SOURCES.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                        <Textarea
                          placeholder="Adicione notas sobre esta oportunidade..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Fields */}
                <CustomFieldsFormCreate
                  ref={customFieldsRef}
                  entityType="opportunity"
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createOpportunity.isPending}>
                {createOpportunity.isPending ? "A criar..." : "Criar Oportunidade"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
