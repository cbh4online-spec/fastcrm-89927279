import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface IfthenpaySettings {
  id: string;
  workspace_id: string;
  is_active: boolean;
  test_mode: boolean;
  mb_entidade: string | null;
  mb_subentidade: string | null;
  mb_key: string | null;
  mbway_key: string | null;
  cc_key: string | null;
  payshop_key: string | null;
  pix_key: string | null;
  anti_phishing_key: string;
  enabled_methods: string[];
  expiry_days: number;
  created_at: string;
  updated_at: string;
}

export type IfthenpayMethod = "multibanco" | "mbway" | "cc" | "payshop" | "pix";

export const IFTHENPAY_METHODS: { id: IfthenpayMethod; label: string }[] = [
  { id: "multibanco", label: "Multibanco (referência)" },
  { id: "mbway", label: "MB WAY" },
  { id: "cc", label: "Cartão de Crédito" },
  { id: "payshop", label: "Payshop" },
  { id: "pix", label: "Pix" },
];

export function useIfthenpaySettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const workspaceSlug = currentWorkspace?.slug;
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["ifthenpay-settings", workspaceId],
    queryFn: async (): Promise<IfthenpaySettings | null> => {
      if (!workspaceId) return null;
      const { data, error } = await (supabase as any)
        .from("ifthenpay_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as IfthenpaySettings | null;
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const initSettings = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { data, error } = await (supabase as any)
        .from("ifthenpay_settings")
        .insert({ workspace_id: workspaceId })
        .select("*")
        .single();
      if (error) throw error;
      return data as IfthenpaySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifthenpay-settings", workspaceId] });
      toast.success("Configuração ifthenpay inicializada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao inicializar"),
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<IfthenpaySettings>) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { data, error } = await (supabase as any)
        .from("ifthenpay_settings")
        .update(patch)
        .eq("workspace_id", workspaceId)
        .select("*")
        .single();
      if (error) throw error;
      return data as IfthenpaySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifthenpay-settings", workspaceId] });
      toast.success("Configuração atualizada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const rotateKey = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Sem workspace");
      // Gera nova key client-side (32 hex chars) — SECURITY DEFINER protegeria mais,
      // mas uma vez que só admins têm UPDATE via RLS isto é seguro o suficiente.
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      const newKey = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
      const { data, error } = await (supabase as any)
        .from("ifthenpay_settings")
        .update({ anti_phishing_key: newKey })
        .eq("workspace_id", workspaceId)
        .select("anti_phishing_key")
        .single();
      if (error) throw error;
      return data?.anti_phishing_key as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ifthenpay-settings", workspaceId] });
      toast.success("Anti-phishing key rodada — atualiza no backoffice ifthenpay!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao rodar key"),
  });

  // Build callback URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const buildCallbackUrl = (key: string) => {
    if (!workspaceSlug) return "";
    const base = `${supabaseUrl}/functions/v1/ifthenpay-callback`;
    const params = new URLSearchParams({ workspace: workspaceSlug, key });
    return `${base}?${params.toString()}`;
  };

  const callbackUrl = settingsQuery.data
    ? buildCallbackUrl(settingsQuery.data.anti_phishing_key)
    : "";

  // Recent callback logs (admin only, RLS-enforced)
  const logsQuery = useQuery({
    queryKey: ["ifthenpay-callback-logs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("ifthenpay_callback_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Array<{
        id: string;
        received_at: string;
        outcome: string;
        error_message: string | null;
        request_ip: string | null;
        query_params: Record<string, string>;
      }>;
    },
    enabled: !!workspaceId && !!settingsQuery.data,
    staleTime: 15_000,
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    initSettings,
    updateSettings,
    rotateKey,
    callbackUrl,
    logs: logsQuery.data ?? [],
    logsLoading: logsQuery.isLoading,
  };
}
