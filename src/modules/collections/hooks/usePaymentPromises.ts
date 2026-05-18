import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type PaymentPromise = Database["public"]["Tables"]["payment_promises"]["Row"];

export function usePaymentPromises(caseId?: string) {
  return useQuery({
    queryKey: ["payment-promises", caseId],
    enabled: !!caseId,
    queryFn: async (): Promise<PaymentPromise[]> => {
      const { data, error } = await supabase
        .from("payment_promises")
        .select("*")
        .eq("case_id", caseId!)
        .order("promised_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePromise() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      caseId: string;
      promised_amount: number;
      promised_date: string;
      notes?: string;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payment_promises").insert({
        workspace_id: currentWorkspace.id,
        case_id: input.caseId,
        promised_amount: input.promised_amount,
        promised_date: input.promised_date,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      // Log action + atualizar caso para promise + reagendar
      await supabase.from("collection_actions").insert({
        workspace_id: currentWorkspace.id,
        case_id: input.caseId,
        action_type: "promise_created",
        channel: "system",
        subject: `Promessa de ${input.promised_amount.toFixed(2)}€ para ${input.promised_date}`,
        body: input.notes ?? null,
        performed_by: user?.id ?? null,
      });

      await supabase
        .from("collection_cases")
        .update({ status: "promise" })
        .eq("id", input.caseId);

      await supabase.rpc("collections_evaluate_next_action", { p_case_id: input.caseId });
    },
    onSuccess: () => {
      toast.success("Promessa registada");
      qc.invalidateQueries({ queryKey: ["payment-promises"] });
      qc.invalidateQueries({ queryKey: ["collection-case"] });
      qc.invalidateQueries({ queryKey: ["case-actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResolvePromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "kept" | "broken" | "cancelled" }) => {
      const { error } = await supabase
        .from("payment_promises")
        .update({ status: input.status, resolved_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-promises"] });
      qc.invalidateQueries({ queryKey: ["collection-case"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
