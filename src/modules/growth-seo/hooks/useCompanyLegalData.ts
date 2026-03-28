import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyLegalData {
  company_name: string;
  nif: string;
  address_street: string;
  address_postal_code: string;
  address_city: string;
  email_general: string;
  email_dpo: string;
  phone: string;
}

const SETTING_KEY = "company_legal_data";
const QUERY_KEY = ["company_legal_data"];

const DEFAULT_DATA: CompanyLegalData = {
  company_name: "",
  nif: "",
  address_street: "",
  address_postal_code: "",
  address_city: "",
  email_general: "",
  email_dpo: "",
  phone: "",
};

export function useCompanyLegalData() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();

      if (error) throw error;
      return (data?.value as unknown as CompanyLegalData) ?? DEFAULT_DATA;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CompanyLegalData) => {
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("key", SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("admin_settings")
          .update({
            value: values as unknown as Record<string, never>,
            description: "Dados legais da empresa para páginas RGPD",
          })
          .eq("key", SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_settings")
          .insert({
            key: SETTING_KEY,
            value: values as unknown as Record<string, never>,
            description: "Dados legais da empresa para páginas RGPD",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    companyData: data ?? DEFAULT_DATA,
    isLoading,
    saveCompanyData: mutation,
  };
}
