import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Save, Search, Loader2, Globe, Linkedin, Facebook, Instagram, Twitter, CheckCircle2, AlertCircle, X, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const companyBillingSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  tax_id: z.string().min(9, "NIF deve ter 9 dígitos").max(9, "NIF deve ter 9 dígitos").regex(/^\d{9}$/, "NIF deve conter apenas números"),
  billing_email: z.string().email("Email inválido").optional().or(z.literal("")),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  cae_codes: z.array(z.string()).optional().default([]),
  cae_description: z.string().optional(),
  company_status: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  linkedin_url: z.string().optional(),
  facebook_url: z.string().optional(),
  instagram_url: z.string().optional(),
  twitter_url: z.string().optional(),
});

type CompanyBillingFormData = z.infer<typeof companyBillingSchema>;

interface LookupResult {
  company_name?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  cae_codes?: string[];
  cae_description?: string | null;
  company_status?: string | null;
}

export function CompanyBillingForm() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "success" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const form = useForm<CompanyBillingFormData>({
    resolver: zodResolver(companyBillingSchema),
    defaultValues: {
      company_name: "",
      tax_id: "",
      billing_email: "",
      billing_address: "",
      billing_city: "",
      billing_postal_code: "",
      billing_country: "Portugal",
      cae_codes: [],
      cae_description: "",
      company_status: "",
      phone: "",
      website: "",
      linkedin_url: "",
      facebook_url: "",
      instagram_url: "",
      twitter_url: "",
    },
  });

  // Load existing data
  useEffect(() => {
    async function loadWorkspaceData() {
      if (!currentWorkspace?.id) return;

      const { data, error } = await supabase
        .from("workspaces")
        .select("company_name, tax_id, billing_email, billing_address, billing_city, billing_postal_code, billing_country, cae_codes, cae_description, company_status, phone, website, linkedin_url, facebook_url, instagram_url, twitter_url")
        .eq("id", currentWorkspace.id)
        .single();

      if (error) {
        console.error("Error loading workspace billing data:", error);
        return;
      }

      if (data) {
        form.reset({
          company_name: data.company_name || "",
          tax_id: data.tax_id || "",
          billing_email: data.billing_email || "",
          billing_address: data.billing_address || "",
          billing_city: data.billing_city || "",
          billing_postal_code: data.billing_postal_code || "",
          billing_country: data.billing_country || "Portugal",
          cae_codes: (data as any).cae_codes || [],
          cae_description: (data as any).cae_description || "",
          company_status: (data as any).company_status || "",
          phone: (data as any).phone || "",
          website: (data as any).website || "",
          linkedin_url: (data as any).linkedin_url || "",
          facebook_url: (data as any).facebook_url || "",
          instagram_url: (data as any).instagram_url || "",
          twitter_url: (data as any).twitter_url || "",
        });
      }
    }

    loadWorkspaceData();
  }, [currentWorkspace?.id, form]);

  async function handleLookupByNif() {
    const nif = form.getValues("tax_id");

    if (!nif || nif.length !== 9 || !/^\d{9}$/.test(nif)) {
      toast.error("Introduza um NIF válido com 9 dígitos");
      return;
    }

    setIsLookingUp(true);
    setLookupStatus("idle");
    setLookupMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("lookup-company-nif", {
        body: { nif },
      });

      if (error) throw error;

      if (data.error) {
        setLookupStatus("error");
        setLookupMessage(data.error);
        toast.error(data.error);
        return;
      }

      if (data.success && data.data) {
        const companyData: LookupResult = data.data;
        
        // Update form fields with found data
        if (companyData.company_name) {
          form.setValue("company_name", companyData.company_name);
        }
        if (companyData.billing_address) {
          form.setValue("billing_address", companyData.billing_address);
        }
        if (companyData.billing_city) {
          form.setValue("billing_city", companyData.billing_city);
        }
        if (companyData.billing_postal_code) {
          form.setValue("billing_postal_code", companyData.billing_postal_code);
        }
        if (companyData.billing_country) {
          form.setValue("billing_country", companyData.billing_country);
        }
        if (companyData.cae_codes && companyData.cae_codes.length > 0) {
          form.setValue("cae_codes", companyData.cae_codes);
        }
        if (companyData.cae_description) {
          form.setValue("cae_description", companyData.cae_description);
        }
        if (companyData.company_status) {
          form.setValue("company_status", companyData.company_status);
        }

        setLookupStatus("success");
        setLookupMessage("Dados preenchidos automaticamente. Verifique e edite se necessário antes de guardar.");
        toast.success("Dados da empresa encontrados!");
      } else {
        setLookupStatus("error");
        setLookupMessage("Empresa não encontrada para este NIF");
      }
    } catch (error) {
      console.error("Error looking up company:", error);
      setLookupStatus("error");
      setLookupMessage("Erro ao pesquisar empresa. Tente novamente.");
      toast.error("Erro ao pesquisar empresa");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function onSubmit(data: CompanyBillingFormData) {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("workspaces")
        .update({
          company_name: data.company_name || null,
          tax_id: data.tax_id || null,
          billing_email: data.billing_email || null,
          billing_address: data.billing_address || null,
          billing_city: data.billing_city || null,
          billing_postal_code: data.billing_postal_code || null,
          billing_country: data.billing_country || null,
          cae_codes: data.cae_codes || [],
          cae_description: data.cae_description || null,
          company_status: data.company_status || null,
          phone: data.phone || null,
          website: data.website || null,
          linkedin_url: data.linkedin_url || null,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          twitter_url: data.twitter_url || null,
        } as any)
        .eq("id", currentWorkspace.id);

      if (error) throw error;

      toast.success("Dados de faturação atualizados com sucesso");
      refreshWorkspaces?.();
    } catch (error) {
      console.error("Error updating billing data:", error);
      toast.error("Erro ao atualizar dados de faturação");
    } finally {
      setIsLoading(false);
    }
  }

  const statusBadge = form.watch("company_status") && (
    <Badge 
      variant={form.watch("company_status")?.toLowerCase().includes("ativ") ? "default" : "destructive"}
      className="ml-2"
    >
      {form.watch("company_status")}
    </Badge>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* NIF Lookup Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Preencher por NIF
              {statusBadge}
            </CardTitle>
            <CardDescription>
              Introduza o NIF e os dados da empresa serão preenchidos automaticamente via Racius
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        placeholder="NIF (9 dígitos)" 
                        maxLength={9}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                onClick={handleLookupByNif}
                disabled={isLookingUp}
                className="gap-2"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A pesquisar...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Preencher automaticamente
                  </>
                )}
              </Button>
            </div>

            {lookupMessage && (
              <Alert variant={lookupStatus === "success" ? "default" : "destructive"}>
                {lookupStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{lookupMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Company Information */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informação da Empresa
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Legal *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome legal da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado da Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ativa, Encerrada, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cae_codes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Códigos CAE</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((code, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {code}
                            <button
                              type="button"
                              onClick={() => {
                                const newCodes = [...(field.value || [])];
                                newCodes.splice(index, 1);
                                field.onChange(newCodes);
                              }}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar código CAE (ex: 74900)"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const value = input.value.trim();
                              if (value && /^\d{5}$/.test(value)) {
                                const currentCodes = field.value || [];
                                if (!currentCodes.includes(value)) {
                                  field.onChange([...currentCodes, value]);
                                }
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const input = document.querySelector('input[placeholder*="CAE"]') as HTMLInputElement;
                            if (input) {
                              const value = input.value.trim();
                              if (value && /^\d{5}$/.test(value)) {
                                const currentCodes = field.value || [];
                                if (!currentCodes.includes(value)) {
                                  field.onChange([...currentCodes, value]);
                                }
                                input.value = '';
                              }
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Pressione Enter ou clique + para adicionar</p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cae_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atividade Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição da atividade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-medium">Contactos</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="billing_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="geral@empresa.pt" {...field} />
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
                    <Input placeholder="+351 XXX XXX XXX" {...field} />
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
                <FormLabel className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  Website
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://www.empresa.pt" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h4 className="font-medium">Morada</h4>

          <FormField
            control={form.control}
            name="billing_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Textarea placeholder="Rua, número, andar..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="billing_city"
              render={({ field }) => (
                <FormItem>
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
              name="billing_postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Postal</FormLabel>
                  <FormControl>
                    <Input placeholder="1000-000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input placeholder="Portugal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Social Media */}
        <div className="space-y-4">
          <h4 className="font-medium">Redes Sociais</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="linkedin_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/company/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facebook_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Facebook className="h-3 w-3" />
                    Facebook
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://facebook.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Instagram className="h-3 w-3" />
                    Instagram
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="twitter_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Twitter className="h-3 w-3" />
                    Twitter / X
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://twitter.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="h-4 w-4" />
            {isLoading ? "A guardar..." : "Guardar Dados"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
