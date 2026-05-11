import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export type IfthenpayMethodId = "multibanco" | "mbway" | "cc" | "payshop" | "pix";

export interface IfthenpayPayment {
  id: string;
  workspace_id: string;
  reference_type: "order" | "invoice" | "subscription" | "manual";
  reference_id: string | null;
  method: IfthenpayMethodId;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "expired" | "cancelled" | "failed";
  mb_entidade: string | null;
  mb_referencia: string | null;
  mb_expiry_date: string | null;
  mbway_request_id: string | null;
  mbway_phone: string | null;
  cc_request_id: string | null;
  cc_payment_url: string | null;
  payshop_reference: string | null;
  ifthenpay_order_id: string;
  paid_at: string | null;
  paid_amount: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateIfthenpayPaymentInput {
  method: IfthenpayMethodId;
  amount: number;
  currency?: string;
  reference_type: "order" | "invoice" | "subscription" | "manual";
  reference_id?: string | null;
  description?: string;
  mbway_phone?: string;
  return_url?: string;
  cancel_url?: string;
  expires_in_days?: number;
}

export function useIfthenpayPayments(filters?: { reference_type?: string; reference_id?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ifthenpay-payments", wid, filters],
    enabled: !!wid,
    queryFn: async (): Promise<IfthenpayPayment[]> => {
      let q = sb
        .from("ifthenpay_payments")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (filters?.reference_type) q = q.eq("reference_type", filters.reference_type);
      if (filters?.reference_id) q = q.eq("reference_id", filters.reference_id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateIfthenpayPayment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateIfthenpayPaymentInput): Promise<IfthenpayPayment> => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("ifthenpay-create-payment", {
        body: { workspace_id: currentWorkspace.id, ...input },
      });
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; payment?: IfthenpayPayment };
      if (!r?.ok || !r.payment) throw new Error(r?.error || "Falha ao criar pagamento");
      return r.payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ifthenpay-payments"] });
      toast.success("Pagamento ifthenpay criado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro a criar pagamento"),
  });
}
