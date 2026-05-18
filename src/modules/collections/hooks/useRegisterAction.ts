import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";
import type {
  CollectionActionType,
  CollectionChannel,
} from "../types/collections";

export interface RegisterActionInput {
  caseId: string;
  actionType: CollectionActionType;
  channel?: CollectionChannel | null;
  subject?: string;
  body?: string;
  outcome?: string;
  metadata?: Record<string, unknown>;
}

export function useRegisterAction() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RegisterActionInput) => {
      if (!currentWorkspace) throw new Error("Sem workspace ativo");

      const { data, error } = await supabase
        .from("collection_actions")
        .insert([
          {
            workspace_id: currentWorkspace.id,
            case_id: input.caseId,
            action_type: input.actionType,
            channel: input.channel ?? null,
            subject: input.subject ?? null,
            body: input.body ?? null,
            outcome: input.outcome ?? null,
            performed_by: user?.id ?? null,
            is_automated: false,
            metadata: input.metadata ?? {},
          },
        ])
        .select()
        .single();
      if (error) throw error;

      // Atualizar last_action_at no caso
      await supabase
        .from("collection_cases")
        .update({ last_action_at: new Date().toISOString() })
        .eq("id", input.caseId);

      // Recalcular totais (caso pagamento tenha sido registado externamente)
      await supabase.rpc("recompute_case_totals", { p_case_id: input.caseId });

      // Emitir evento kernel (fire-and-forget)
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: "COLLECTIONS.ACTION_REGISTERED",
        entity_kind: "collection_case",
        entity_id: input.caseId,
        actor_id: user?.id,
        source_module: "collections",
        payload: {
          action_type: input.actionType,
          channel: input.channel ?? null,
        },
      });

      return data;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["case-actions", input.caseId] });
      qc.invalidateQueries({ queryKey: ["collection-case", input.caseId] });
      qc.invalidateQueries({ queryKey: ["collection-cases"] });
      toast.success("Ação registada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao registar ação: " + err.message);
    },
  });
}
