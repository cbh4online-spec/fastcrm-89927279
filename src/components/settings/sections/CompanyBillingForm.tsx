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
  FormDescription,
} from "@/components/ui/form";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Save, Sparkles, Loader2, Globe, Linkedin, Facebook, Instagram, Twitter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const companyBillingSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  tax_id: z.string().min(1, "NIF é obrigatório"),
  billing_email: z.string().email("Email inválido").optional().or(z.literal("")),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  linkedin_url: z.string().optional(),
  facebook_url: z.string().optional(),
  instagram_url: z.string().optional(),
  twitter_url: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
});

type CompanyBillingFormData = z.infer<typeof companyBillingSchema>;

interface EnrichmentResult {
  company_name?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  billing_email?: string;
  phone?: string;
  website?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  industry?: string;
  description?: string;
  confidence?: "high" | "medium" | "low";
}

export function CompanyBillingForm() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentConfidence, setEnrichmentConfidence] = useState<string | null>(null);

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
      phone: "",
      website: "",
      linkedin_url: "",
      facebook_url: "",
      instagram_url: "",
      twitter_url: "",
      industry: "",
      description: "",
    },
  });

  // Load existing data
  useEffect(() => {
    async function loadWorkspaceData() {
      if (!currentWorkspace?.id) return;

      const { data, error } = await supabase
        .from("workspaces")
        .select("company_name, tax_id, billing_email, billing_address, billing_city, billing_postal_code, billing_country")
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
          phone: "",
          website: "",
          linkedin_url: "",
          facebook_url: "",
          instagram_url: "",
          twitter_url: "",
          industry: "",
          description: "",
        });
      }
    }

    loadWorkspaceData();
  }, [currentWorkspace?.id, form]);

  async function handleEnrichData() {
    const taxId = form.getValues("tax_id");
    const country = form.getValues("billing_country") || "Portugal";

    if (!taxId || taxId.length < 9) {
      toast.error("Introduza um NIF/NIPC válido para enriquecer os dados");
      return;
    }

    setIsEnriching(true);
    setEnrichmentConfidence(null);

    try {
      const { data, error } = await supabase.functions.invoke("enrich-company-data", {
        body: { tax_id: taxId, country },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.success && data.data) {
        const enrichedData: EnrichmentResult = data.data;
        setEnrichmentConfidence(enrichedData.confidence || null);

        // Only update fields that have values and are currently empty or user confirms
        const currentValues = form.getValues();
        const updates: Partial<CompanyBillingFormData> = {};

        if (enrichedData.company_name && !currentValues.company_name) {
          updates.company_name = enrichedData.company_name;
        }
        if (enrichedData.billing_address && !currentValues.billing_address) {
          updates.billing_address = enrichedData.billing_address;
        }
        if (enrichedData.billing_city && !currentValues.billing_city) {
          updates.billing_city = enrichedData.billing_city;
        }
        if (enrichedData.billing_postal_code && !currentValues.billing_postal_code) {
          updates.billing_postal_code = enrichedData.billing_postal_code;
        }
        if (enrichedData.billing_country && !currentValues.billing_country) {
          updates.billing_country = enrichedData.billing_country;
        }
        if (enrichedData.billing_email && !currentValues.billing_email) {
          updates.billing_email = enrichedData.billing_email;
        }
        if (enrichedData.phone && !currentValues.phone) {
          updates.phone = enrichedData.phone;
        }
        if (enrichedData.website && !currentValues.website) {
          updates.website = enrichedData.website;
        }
        if (enrichedData.linkedin_url && !currentValues.linkedin_url) {
          updates.linkedin_url = enrichedData.linkedin_url;
        }
        if (enrichedData.facebook_url && !currentValues.facebook_url) {
          updates.facebook_url = enrichedData.facebook_url;
        }
        if (enrichedData.instagram_url && !currentValues.instagram_url) {
          updates.instagram_url = enrichedData.instagram_url;
        }
        if (enrichedData.twitter_url && !currentValues.twitter_url) {
          updates.twitter_url = enrichedData.twitter_url;
        }
        if (enrichedData.industry && !currentValues.industry) {
          updates.industry = enrichedData.industry;
        }
        if (enrichedData.description && !currentValues.description) {
          updates.description = enrichedData.description;
        }

        // Apply updates
        Object.entries(updates).forEach(([key, value]) => {
          form.setValue(key as keyof CompanyBillingFormData, value as string);
        });

        const fieldsUpdated = Object.keys(updates).length;
        if (fieldsUpdated > 0) {
          toast.success(data.message || `${fieldsUpdated} campos preenchidos automaticamente`);
        } else {
          toast.info("Nenhum campo novo foi encontrado para preencher");
        }
      }
    } catch (error) {
      console.error("Error enriching data:", error);
      toast.error("Erro ao enriquecer dados. Tente novamente.");
    } finally {
      setIsEnriching(false);
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
        })
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

  const confidenceBadge = enrichmentConfidence && (
    <Badge 
      variant={enrichmentConfidence === "high" ? "default" : enrichmentConfidence === "medium" ? "secondary" : "outline"}
      className="ml-2"
    >
      Confiança: {enrichmentConfidence === "high" ? "Alta" : enrichmentConfidence === "medium" ? "Média" : "Baixa"}
    </Badge>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* AI Enrichment Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Enriquecimento com IA
              {confidenceBadge}
            </CardTitle>
            <CardDescription>
              Introduza o NIF/NIPC e a IA pesquisará automaticamente os dados da empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="NIF/NIPC (ex: 123456789)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                onClick={handleEnrichData}
                disabled={isEnriching}
                className="gap-2"
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A pesquisar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Pesquisar dados
                  </>
                )}
              </Button>
            </div>
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
                  <FormLabel>Nome da Empresa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome legal da empresa" {...field} />
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
                  <FormLabel>Setor / Indústria</FormLabel>
                  <FormControl>
                    <Input placeholder="Tecnologia, Saúde, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Breve descrição da empresa..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
