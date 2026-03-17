import { useState, useRef } from "react";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";
import { User, Building2, Search, Loader2 } from "lucide-react";

const leadSchema = z.object({
  lead_type: z.enum(["person", "company"]).default("person"),
  name: z.string().min(1, "Nome é obrigatório").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  source: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(["new", "in_progress", "completed"]).default("new"),
  // Company fields
  company_name: z.string().max(200).optional().or(z.literal("")),
  tax_id: z.string().max(50).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  number_of_employees: z.string().max(50).optional().or(z.literal("")),
  contact_person: z.string().max(100).optional().or(z.literal("")),
  contact_person_role: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadDialog({ open, onOpenChange }: CreateLeadDialogProps) {
  const createLead = useCreateLead();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);
  const { trackLeadCreated } = useCRMAnalytics();
  const { lookup, isLoading: isNifSearching } = useNifLookup({
    showToasts: true,
    onSuccess: (data: NifLookupResult) => {
      // Auto-fill fields from NIF lookup
      if (data.company_name) form.setValue("name", data.company_name);
      if (data.address) form.setValue("address", data.address);
      if (data.city) form.setValue("city", data.city);
      if (data.postal_code) form.setValue("postal_code", data.postal_code);
      if (data.email) form.setValue("email", data.email);
      if (data.phone) form.setValue("phone", data.phone);
      if (data.website) form.setValue("website", data.website);
      if (data.cae_description) form.setValue("industry", data.cae_description);
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
      city: "",
      postal_code: "",
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
        address: values.address || undefined,
        city: values.city || undefined,
        postal_code: values.postal_code || undefined,
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
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao criar lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                  <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
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
                        <FormLabel>Setor</FormLabel>
                        <FormControl>
                          <Input placeholder="Tecnologia, Saúde..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-3 sm:col-span-1">
                        <FormLabel>Morada</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Lisboa" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                          <Input placeholder="1000-001" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

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
                      <Input placeholder="+351 912 345 678" {...field} />
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