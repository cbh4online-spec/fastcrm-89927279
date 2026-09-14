import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface LeadDuplicateMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  matchType: "email" | "phone" | "name_exact";
  isBlockingDuplicate: boolean;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/**
 * Deteta possíveis leads duplicadas no workspace atual.
 * Consultas específicas (email/telefone/nome) para evitar carregar a tabela inteira.
 */
export function useLeadDuplicateCheck(
  name?: string,
  email?: string,
  phone?: string,
  excludeId?: string,
) {
  const { currentWorkspace } = useWorkspace();

  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedPhone = (phone || "").trim();
  const phoneDigits = normalizePhone(trimmedPhone).slice(-9);

  const hasInput =
    trimmedName.length >= 3 || trimmedEmail.includes("@") || phoneDigits.length >= 9;

  return useQuery({
    queryKey: [
      "lead-duplicates",
      currentWorkspace?.id,
      trimmedName,
      trimmedEmail,
      phoneDigits,
      excludeId,
    ],
    queryFn: async (): Promise<LeadDuplicateMatch[]> => {
      if (!currentWorkspace) return [];

      const matches = new Map<string, LeadDuplicateMatch>();

      const baseQuery = () =>
        supabase
          .from("leads")
          .select("id, name, email, phone")
          .eq("workspace_id", currentWorkspace.id)
          .is("archived_at", null)
          .limit(5);

      if (trimmedEmail.includes("@")) {
        const { data } = await baseQuery().ilike("email", trimmedEmail);
        for (const row of data || []) {
          if (excludeId && row.id === excludeId) continue;
          matches.set(row.id, { ...row, matchType: "email", isBlockingDuplicate: true });
        }
      }

      if (phoneDigits.length >= 9) {
        const { data } = await baseQuery().ilike("phone", `%${phoneDigits}%`);
        for (const row of data || []) {
          if (excludeId && row.id === excludeId) continue;
          if (matches.has(row.id)) continue;
          matches.set(row.id, { ...row, matchType: "phone", isBlockingDuplicate: false });
        }
      }

      if (trimmedName.length >= 3) {
        const { data } = await baseQuery().ilike("name", trimmedName);
        for (const row of data || []) {
          if (excludeId && row.id === excludeId) continue;
          if (matches.has(row.id)) continue;
          matches.set(row.id, { ...row, matchType: "name_exact", isBlockingDuplicate: false });
        }
      }

      return Array.from(matches.values());
    },
    enabled: !!currentWorkspace && hasInput,
    staleTime: 1000 * 30,
  });
}
