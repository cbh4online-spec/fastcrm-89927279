import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export type PaymentProviderId = "stripe" | "ifthenpay";

export interface WorkspaceGateway {
  id: string;
  workspace_id: string;
  provider: PaymentProviderId;
  display_name: string | null;
  is_active: boolean;
  is_default: boolean;
  test_mode: boolean;
  capabilities: Record<string, any>;
  last_health_at: string | null;
  last_health_status: string | null;
  last_health_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface GatewayDescriptor {
  id: PaymentProviderId;
  name: string;
  description: string;
  supportsRecurring: boolean;
  supportsOneOff: boolean;
  methods: string[];
  configRoute: string;
}

export const GATEWAY_CATALOG: GatewayDescriptor[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Cartão internacional, subscrições recorrentes e checkout hospedado.",
    supportsRecurring: true,
    supportsOneOff: true,
    methods: ["card", "sepa", "apple_pay", "google_pay"],
    configRoute: "/settings/billing",
  },
  {
    id: "ifthenpay",
    name: "ifthenpay",
    description: "Multibanco, MB WAY, Cartão, Payshop e Pix — gateway nacional PT/BR.",
    supportsRecurring: false,
    supportsOneOff: true,
    methods: ["multibanco", "mbway", "cc", "payshop", "pix"],
    configRoute: "/dashboard/integrations/ifthenpay",
  },
];

export function useWorkspaceGateways() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["workspace-payment-gateways", wid],
    enabled: !!wid,
    queryFn: async (): Promise<WorkspaceGateway[]> => {
      const { data, error } = await sb
        .from("workspace_payment_gateways")
        .select("*")
        .eq("workspace_id", wid);
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<WorkspaceGateway> & { provider: PaymentProviderId }) => {
      if (!wid) throw new Error("Sem workspace");
      const { data, error } = await sb
        .from("workspace_payment_gateways")
        .upsert(
          { workspace_id: wid, ...input },
          { onConflict: "workspace_id,provider" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkspaceGateway;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-payment-gateways", wid] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro a guardar gateway"),
  });

  const setActive = useMutation({
    mutationFn: async (input: { provider: PaymentProviderId; is_active: boolean }) => {
      return upsert.mutateAsync({ provider: input.provider, is_active: input.is_active });
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.is_active ? "Gateway ativado" : "Gateway desativado");
    },
  });

  const setDefault = useMutation({
    mutationFn: async (provider: PaymentProviderId) => {
      return upsert.mutateAsync({ provider, is_default: true, is_active: true });
    },
    onSuccess: () => toast.success("Gateway predefinido atualizado"),
  });

  const setTestMode = useMutation({
    mutationFn: async (input: { provider: PaymentProviderId; test_mode: boolean }) => {
      return upsert.mutateAsync({ provider: input.provider, test_mode: input.test_mode });
    },
    onSuccess: () => toast.success("Modo atualizado"),
  });

  // Merge catalog + DB rows for UI consumption
  const merged = GATEWAY_CATALOG.map((descriptor) => {
    const row = query.data?.find((g) => g.provider === descriptor.id);
    return { descriptor, row: row ?? null };
  });

  return {
    gateways: query.data ?? [],
    merged,
    isLoading: query.isLoading,
    upsert,
    setActive,
    setDefault,
    setTestMode,
  };
}
