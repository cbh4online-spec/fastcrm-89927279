import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyLegalData } from "./useCompanyLegalData";

export interface CompanySocialLinks {
  linkedin_url: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
}

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

const DEFAULT_SOCIAL: CompanySocialLinks = {
  linkedin_url: "",
  facebook_url: "",
  instagram_url: "",
  twitter_url: "",
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

  const { data: socialData } = useQuery({
    queryKey: ["public_company_social_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "company_social_links")
        .maybeSingle();

      if (error) {
        console.warn("Failed to load social links:", error.message);
        return DEFAULT_SOCIAL;
      }
      const val = data?.value as unknown as CompanySocialLinks | null;
      return val ? { ...DEFAULT_SOCIAL, ...val } : DEFAULT_SOCIAL;
    },
    staleTime: 5 * 60 * 1000,
  });

  const c = data ?? DEFAULTS;
  const fullAddress = [c.address_street, c.address_postal_code, c.address_city].filter(Boolean).join(", ");
  const socialLinks = socialData ?? DEFAULT_SOCIAL;

  return { company: c, fullAddress, socialLinks, isLoading };
}
