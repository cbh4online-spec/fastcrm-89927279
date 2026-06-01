import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export type BillingProvider =
  | "invoicexpress"
  | "moloni"
  | "vendus"
  | "sage"
  | "primavera";

export interface BillingIntegration {
  id: string;
  workspace_id: string;
  provider: BillingProvider;
  display_name: string | null;
  account_name: string;
  config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  last_check_at: string | null;
  last_check_status: string | null;
  last_check_error: string | null;
  api_key_masked: string | null;
  created_at: string;
  updated_at: string;
}

export function useBillingIntegrations() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["billing-integrations", wid],
    enabled: !!wid,
    queryFn: async (): Promise<BillingIntegration[]> => {
      const { data, error } = await sb
        .from("workspace_billing_integrations_safe")
        .select("*")
        .eq("workspace_id", wid)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTestBillingConnection() {
  return useMutation({
    mutationFn: async (input: {
      provider: BillingProvider;
      account_name: string;
      api_key: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-integration-test",
        { body: input },
      );
      if (error) throw error;
      return data as { ok: boolean; error?: string; account_info?: any };
    },
  });
}

export function useRecheckBillingIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-integration-recheck",
        { body: { id } },
      );
      if (error) throw error;
      return data as { ok: boolean; error?: string };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["billing-integrations"] });
      if (r.ok) toast.success("Ligação validada com sucesso");
      else toast.error(r.error || "Falha ao validar ligação");
    },
    onError: (e: any) => toast.error(e.message || "Erro a testar ligação"),
  });
}

export function useSaveBillingIntegration() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      provider: BillingProvider;
      display_name?: string;
      account_name: string;
      api_key?: string;
      config?: Record<string, any>;
      is_active?: boolean;
      is_default?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-integration-save",
        { body: { ...input, workspace_id: currentWorkspace!.id } },
      );
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; id?: string };
      if (!r.ok) throw new Error(r.error || "Falha ao guardar");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-integrations"] });
      toast.success("Integração guardada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao guardar"),
  });
}

export function useDeleteBillingIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("workspace_billing_integrations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-integrations"] });
      toast.success("Integração removida");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });
}

export function useSetDefaultBillingIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("workspace_billing_integrations")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-integrations"] });
      toast.success("Integração definida como predefinida");
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });
}
