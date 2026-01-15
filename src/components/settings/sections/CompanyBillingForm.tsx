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
import { Building2, Save } from "lucide-react";

const companyBillingSchema = z.object({
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  tax_id: z.string().min(1, "NIF é obrigatório"),
  billing_email: z.string().email("Email inválido").optional().or(z.literal("")),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
});

type CompanyBillingFormData = z.infer<typeof companyBillingSchema>;

export function CompanyBillingForm() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

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
        });
      }
    }

    loadWorkspaceData();
  }, [currentWorkspace?.id, form]);

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            name="tax_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIF / NIPC *</FormLabel>
                <FormControl>
                  <Input placeholder="123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="billing_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email de Faturação</FormLabel>
              <FormControl>
                <Input type="email" placeholder="faturacao@empresa.pt" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Morada</FormLabel>
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
