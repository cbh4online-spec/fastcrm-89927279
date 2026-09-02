import { useState, useRef } from "react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhone } from "@/utils/phone";
import { useCreateLead, LeadStatus, LeadType } from "@/hooks/useLeads";
import { useNifLookup, NifLookupResult } from "@/hooks/useNifLookup";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";
import { User, Building2, Search, Loader2, ChevronDown, Link2 } from "lucide-react";

const leadSchema = z.object({
  lead_type: z.enum(["person", "company"]).default("person"),
  name: z.string().min(1, "Nome é obrigatório").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || isValidPhone(val, "PT"),
      { message: "Número de telefone inválido" },
    ),
  source: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(["new", "in_progress", "completed"]).default("new"),
  // Company fields
  company_name: z.string().max(200).optional().or(z.literal("")),
  tax_id: z.string().max(50).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  industry: z.string().max(2000).optional().or(z.literal("")),
  number_of_employees: z.string().max(50).optional().or(z.literal("")),
  contact_person: z.string().max(100).optional().or(z.literal("")),
  contact_person_role: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  address_number: z.string().max(100).optional().or(z.literal("")),
  address_floor: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  region: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface NifEnrichmentState {
  cae_codes: string[];
  cae_description: string | null;
  legal_nature: string | null;
  capital_social: string | null;
  founding_date: string | null;
  company_status: string | null;
  region: string | null;
  county: string | null;
  parish: string | null;
  fax: string | null;
  about: string | null;
  activity_description: string | null;
  racius_url: string | null;
}

const emptyEnrichment: NifEnrichmentState = {
  cae_codes: [],
  cae_description: null,
  legal_nature: null,
  capital_social: null,
  founding_date: null,
  company_status: null,
  region: null,
  county: null,
  parish: null,
  fax: null,
  about: null,
  activity_description: null,
  racius_url: null,
};

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadDialog({ open, onOpenChange }: CreateLeadDialogProps) {
  const createLead = useCreateLead();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);
  const { trackLeadCreated } = useCRMAnalytics();
  const [nifData, setNifData] = useState<NifEnrichmentState>(emptyEnrichment);
  const [optionalsOpen, setOptionalsOpen] = useState(false);

  const { lookup, isLoading: isNifSearching } = useNifLookup({
    showToasts: true,
    onSuccess: (data: NifLookupResult) => {
      // Auto-fill form fields
      if (data.company_name) form.setValue("name", data.company_name);
      if (data.address) form.setValue("address", data.address);
      if (data.city) form.setValue("city", data.city);
      if (data.postal_code) form.setValue("postal_code", data.postal_code);
      if (data.region) form.setValue("region", data.region);
      if (data.email) form.setValue("email", data.email);
      if (data.phone) form.setValue("phone", data.phone);
      if (data.website) form.setValue("website", data.website);
      if (data.cae_description) form.setValue("industry", data.cae_description);

      // Store enrichment state for card display and submission
      setNifData({
        cae_codes: data.cae_codes || [],
        cae_description: data.cae_description || null,
        legal_nature: data.legal_nature || null,
        capital_social: data.capital_social || null,
        founding_date: data.founding_date || null,
        company_status: data.company_status || null,
        region: data.region || null,
        county: data.county || null,
        parish: data.parish || null,
        fax: data.fax || null,
        about: data.about || null,
        activity_description: data.activity_description || null,
        racius_url: data.racius_url || null,
      });

      // Auto-expand optional fields when NIF data is found
      setOptionalsOpen(true);
    },
  });

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      lead_type: "person",
      name: "",
      email: "",
      phone: "",
      source: "",
      status: "new",
      company_name: "",
      tax_id: "",
      website: "",
      industry: "",
      number_of_employees: "",
      contact_person: "",
      contact_person_role: "",
      address: "",
      address_number: "",
      address_floor: "",
      city: "",
      postal_code: "",
      region: "",
      country: "Portugal",
    },
  });

  const leadType = form.watch("lead_type");

  const handleNifSearch = async () => {
    const nif = form.getValues("tax_id");
    const cleanNif = (nif || "").replace(/\D/g, "");
    if (cleanNif.length !== 9) {
      toast.error("NIF deve ter 9 dígitos");
      return;
    }
    form.setValue("tax_id", cleanNif);
    await lookup(cleanNif);
  };

  const hasNifData = nifData.cae_codes.length > 0 || nifData.legal_nature || nifData.about || nifData.region;

  const onSubmit = async (values: LeadFormValues) => {
    try {
      const result = await createLead.mutateAsync({
        lead_type: values.lead_type as LeadType,
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        source: values.source || undefined,
        status: values.status as LeadStatus,
        company_name: values.company_name || undefined,
        tax_id: values.tax_id || undefined,
        website: values.website || undefined,
        industry: values.industry || undefined,
        number_of_employees: values.number_of_employees || undefined,
        contact_person: values.contact_person || undefined,
        contact_person_role: values.contact_person_role || undefined,
        address: values.address?.trim() || undefined,
        address_number: values.address_number?.trim() || undefined,
        address_floor: values.address_floor?.trim() || undefined,
        city: values.city?.trim() || undefined,
        postal_code: values.postal_code?.trim() || undefined,
        country: values.country?.trim() || undefined,
        // NIF enrichment fields
        cae_codes: nifData.cae_codes.length > 0 ? nifData.cae_codes : undefined,
        cae_description: nifData.cae_description || undefined,
        legal_nature: nifData.legal_nature || undefined,
        capital_social: nifData.capital_social || undefined,
        founding_date: nifData.founding_date || undefined,
        region: values.region?.trim() || nifData.region || undefined,
        county: nifData.county || undefined,
        parish: nifData.parish || undefined,
        fax: nifData.fax || undefined,
        about: nifData.about || undefined,
        activity_description: nifData.activity_description || undefined,
        racius_url: nifData.racius_url || undefined,
      });
      
      if (result?.id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields(result.id);
      }

      trackLeadCreated({
        source_type: values.source || 'manual',
        industry_segment: undefined,
        lead_score: 0,
      });
      
      toast.success("Lead criado com sucesso");
      form.reset();
      setNifData(emptyEnrichment);
      setOptionalsOpen(false);
      onOpenChange(false);
    } catch (error: any) {
      if (error?.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe um lead com este email neste workspace.");
      } else {
        toast.error("Erro ao criar lead");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Crie um novo lead pessoa ou empresa.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Lead Type Toggle */}
            <FormField
              control={form.control}
              name="lead_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Lead</FormLabel>
                  <Tabs value={field.value} onValueChange={(val) => {
                    field.onChange(val);
                    // Reset NIF data when switching type
                    if (val === "person") {
                      setNifData(emptyEnrichment);
                    }
                  }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="person" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Pessoa
                      </TabsTrigger>
                      <TabsTrigger value="company" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Empresa
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />

            {/* Name - changes label based on type */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{leadType === "company" ? "Nome da Empresa *" : "Nome *"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={leadType === "company" ? "Empresa Lda" : "João Silva"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company-specific fields */}
            {leadType === "company" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIF</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="123456789"
                              maxLength={9}
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                                field.onChange(val);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={handleNifSearch}
                              disabled={isNifSearching || (field.value || "").replace(/\D/g, "").length !== 9}
                              title="Pesquisar dados pelo NIF"
                            >
                              {isNifSearching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor / CAE</FormLabel>
                        <FormControl>
                          <Input placeholder="Tecnologia, Saúde..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* NIF Data Card - identical to CreateCompanyDialog */}
                {hasNifData && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" />
                        Dados obtidos via NIF
                      </p>
                      <div className="grid gap-1.5 text-xs">
                        {form.getValues("address") && (
                          <div>
                            <span className="text-muted-foreground">Morada:</span>{" "}
                            {form.getValues("address")}
                            {form.getValues("postal_code") ? `, ${form.getValues("postal_code")}` : ""}
                            {form.getValues("city") ? ` ${form.getValues("city")}` : ""}
                          </div>
                        )}
                        {nifData.region && (
                          <div>
                            <span className="text-muted-foreground">Distrito/Concelho:</span>{" "}
                            {nifData.region}
                            {nifData.county ? ` / ${nifData.county}` : ""}
                            {nifData.parish ? ` / ${nifData.parish}` : ""}
                          </div>
                        )}
                        {nifData.legal_nature && (
                          <div><span className="text-muted-foreground">Natureza Jurídica:</span> {nifData.legal_nature}</div>
                        )}
                        {nifData.capital_social && (
                          <div><span className="text-muted-foreground">Capital Social:</span> {nifData.capital_social}</div>
                        )}
                        {nifData.founding_date && (
                          <div><span className="text-muted-foreground">Data de Constituição:</span> {nifData.founding_date}</div>
                        )}
                        {nifData.company_status && (
                          <div><span className="text-muted-foreground">Estado:</span> {nifData.company_status}</div>
                        )}
                        {nifData.cae_codes.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-muted-foreground">CAE:</span>
                            {nifData.cae_codes.map((code) => (
                              <Badge key={code} variant="secondary" className="text-[10px] px-1.5 py-0">{code}</Badge>
                            ))}
                            {nifData.cae_description && <span className="text-muted-foreground">— {nifData.cae_description}</span>}
                          </div>
                        )}
                        {nifData.activity_description && (
                          <div><span className="text-muted-foreground">Atividade:</span> {nifData.activity_description}</div>
                        )}
                        {nifData.about && (
                          <div className="pt-1 border-t border-blue-200 dark:border-blue-800 mt-1">
                            <span className="text-muted-foreground">Acerca:</span>{" "}
                            <span className="line-clamp-3">{nifData.about}</span>
                          </div>
                        )}
                        {nifData.racius_url && (
                          <div>
                            <a href={nifData.racius_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              <Link2 className="w-3 h-3" /> Ver no Racius
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.pt" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="number_of_employees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº Funcionários</FormLabel>
                        <FormControl>
                          <Input placeholder="1-10, 11-50..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pessoa de Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do contacto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="contact_person_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="CEO, Diretor Comercial..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </>
            )}

            {/* Morada — disponível para leads pessoa e empresa */}
            <Collapsible open={optionalsOpen} onOpenChange={setOptionalsOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  Morada
                  <ChevronDown className={`h-4 w-4 transition-transform ${optionalsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-4">
                        <FormLabel>Morada</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address_number"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address_floor"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Andar</FormLabel>
                        <FormControl>
                          <Input placeholder="3.º Esq." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                          <Input placeholder="1000-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Lisboa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Região</FormLabel>
                        <FormControl>
                          <Input placeholder="Lisboa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>País</FormLabel>
                        <FormControl>
                          <Input placeholder="Portugal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Person-specific: company_name as optional */}
            {leadType === "person" && (
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Empresa onde trabalha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <PhoneInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <FormControl>
                      <Input placeholder="Website, Referência..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Custom Fields */}
            <CustomFieldsFormCreate
              ref={customFieldsRef}
              entityType="lead"
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending ? "A criar..." : "Criar Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
