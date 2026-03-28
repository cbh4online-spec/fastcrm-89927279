import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyLegalData } from "./useCompanyLegalData";

const DEFAULTS: CompanyLegalData = {
  company_name: "FastCRM, Lda.",
  nif: "",
  address_street: "",
  address_postal_code: "",
  address_city: "Portugal",
  email_general: "geral@fastcrm.pt",
  email_dpo: "dpo@fastcrm.pt",
  phone: "",
};

export function usePublicCompanyData() {
  const { data, isLoading } = useQuery({
    queryKey: ["public_company_legal_data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "company_legal_data")
        .maybeSingle();

      if (error) {
        console.warn("Failed to load company legal data:", error.message);
        return DEFAULTS;
      }
      const val = data?.value as unknown as CompanyLegalData | null;
      if (!val || !val.company_name) return DEFAULTS;
      return { ...DEFAULTS, ...val };
    },
    staleTime: 5 * 60 * 1000,
  });

  const c = data ?? DEFAULTS;
  const fullAddress = [c.address_street, c.address_postal_code, c.address_city].filter(Boolean).join(", ");

  return { company: c, fullAddress, isLoading };
}
