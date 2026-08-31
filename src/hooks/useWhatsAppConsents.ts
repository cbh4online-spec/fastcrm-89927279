import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  consentPhoneKey,
  WHATSAPP_CONSENT_TEXT,
  WHATSAPP_CONSENT_VERSION,
  type WhatsAppConsentRow,
  type WhatsAppConsentSource,
} from "@/lib/whatsapp/consent";

export interface ConsentFilters {
  search?: string;
  status?: "all" | "granted" | "revoked";
  source?: string;
}

export function useWhatsAppConsents(filters: ConsentFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const list = useQuery({
    queryKey: ["whatsapp-consents", workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WhatsAppConsentRow[]> => {
      let query = supabase
        .from("whatsapp_consents")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false })
        .limit(2000);

      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.source && filters.source !== "all") query = query.eq("source", filters.source);
      if (filters.search?.trim()) query = query.ilike("phone", `%${filters.search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppConsentRow[];
    },
  });

  const grant = useMutation({
    mutationFn: async (input: {
      phone: string;
      source?: WhatsAppConsentSource;
      source_reference?: string | null;
      contact_id?: string | null;
      lead_id?: string | null;
      company_id?: string | null;
    }) => {
      if (!workspaceId) throw new Error("Sem workspace ativo");
      const phone = input.phone.startsWith("+") ? input.phone : `+${consentPhoneKey(input.phone)}`;
      const { error } = await supabase.from("whatsapp_consents").upsert(
        {
          workspace_id: workspaceId,
          phone,
          contact_id: input.contact_id ?? null,
          lead_id: input.lead_id ?? null,
          company_id: input.company_id ?? null,
          status: "granted",
          consent_category: "marketing",
          consent_text: WHATSAPP_CONSENT_TEXT,
          consent_version: WHATSAPP_CONSENT_VERSION,
          source: input.source ?? "manual_import",
          source_reference: input.source_reference ?? null,
          granted_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "workspace_id,phone,consent_category" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-consents"] });
      toast.success("Consentimento registado");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao registar consentimento"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_consents")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-consents"] });
      toast.success("Consentimento revogado");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao revogar"),
  });

  return { consents: list.data ?? [], isLoading: list.isLoading, grant, revoke, refetch: list.refetch };
}

/**
 * Carrega, para um conjunto de telefones, os que têm consentimento ativo
 * e os que estão em opt-out — sempre no âmbito do workspace atual.
 */
export async function fetchConsentSets(workspaceId: string): Promise<{
  granted: Set<string>;
  revoked: Set<string>;
  optouts: Set<string>;
}> {
  const granted = new Set<string>();
  const revoked = new Set<string>();
  const optouts = new Set<string>();

  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("whatsapp_consents")
      .select("phone, status, consent_category")
      .eq("workspace_id", workspaceId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as Array<{ phone: string; status: string; consent_category: string }>;
    for (const row of page) {
      const key = consentPhoneKey(row.phone);
      if (!key) continue;
      if (row.status === "granted" && (row.consent_category === "marketing" || row.consent_category === "all")) {
        granted.add(key);
      } else if (row.status === "revoked") {
        revoked.add(key);
      }
    }
    if (page.length < pageSize) break;
  }

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("whatsapp_optouts")
      .select("phone")
      .eq("workspace_id", workspaceId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as Array<{ phone: string }>;
    for (const row of page) optouts.add(consentPhoneKey(row.phone));
    if (page.length < pageSize) break;
  }

  // Um opt-out sobrepõe-se sempre a um consentimento anterior.
  for (const p of optouts) granted.delete(p);

  return { granted, revoked, optouts };
}
