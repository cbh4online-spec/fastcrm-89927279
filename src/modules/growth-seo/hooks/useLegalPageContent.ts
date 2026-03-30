import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalPageData {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export type LegalPageKey = 'legal_page_privacy' | 'legal_page_terms' | 'legal_page_gdpr' | 'legal_page_cookies';

export const LEGAL_PAGE_LABELS: Record<LegalPageKey, string> = {
  legal_page_privacy: 'Política de Privacidade',
  legal_page_terms: 'Termos de Uso',
  legal_page_gdpr: 'RGPD',
  legal_page_cookies: 'Política de Cookies',
};

export const LEGAL_PAGE_KEYS: LegalPageKey[] = [
  'legal_page_privacy',
  'legal_page_terms',
  'legal_page_gdpr',
  'legal_page_cookies',
];

export function useLegalPageContent(pageKey: LegalPageKey) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["legal_page_content", pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", pageKey)
        .maybeSingle();

      if (error) throw error;
      return (data?.value as unknown as LegalPageData) ?? null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (pageData: LegalPageData) => {
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("key", pageKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("admin_settings")
          .update({
            value: pageData as unknown as Record<string, never>,
            description: `Conteúdo da página legal: ${LEGAL_PAGE_LABELS[pageKey]}`,
          })
          .eq("key", pageKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_settings")
          .insert({
            key: pageKey,
            value: pageData as unknown as Record<string, never>,
            description: `Conteúdo da página legal: ${LEGAL_PAGE_LABELS[pageKey]}`,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal_page_content", pageKey] });
      queryClient.invalidateQueries({ queryKey: ["public_legal_page", pageKey] });
      toast.success("Página legal guardada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao guardar: ${error.message}`);
    },
  });

  return {
    pageData: data ?? null,
    isLoading,
    savePageData: saveMutation,
  };
}
