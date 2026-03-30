import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicCompanyData } from "./usePublicCompanyData";
import type { LegalPageData, LegalPageKey } from "./useLegalPageContent";

function replaceVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

export function usePublicLegalPage(pageKey: LegalPageKey, defaults: LegalPageData) {
  const { company, fullAddress } = usePublicCompanyData();

  const vars: Record<string, string> = {
    company_name: company.company_name,
    email_dpo: company.email_dpo,
    email_general: company.email_general,
    address: fullAddress,
    nif: company.nif,
    phone: company.phone,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["public_legal_page", pageKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_legal_page_content", {
        page_key: pageKey,
      });

      if (error) {
        console.warn(`Failed to load legal page ${pageKey}:`, error.message);
        return null;
      }
      return data as unknown as LegalPageData | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const raw = data ?? defaults;

  const processed: LegalPageData = {
    ...raw,
    title: replaceVariables(raw.title, vars),
    description: replaceVariables(raw.description, vars),
    sections: raw.sections.map((s) => ({
      title: replaceVariables(s.title, vars),
      content: replaceVariables(s.content, vars),
    })),
  };

  return { page: processed, isLoading, isFromDB: !!data };
}
