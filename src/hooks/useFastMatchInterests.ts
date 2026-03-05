import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFastMatchProfile } from "./useFastMatchProfile";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

export interface FastMatchInterest {
  id: string;
  workspace_id: string;
  from_profile_id: string;
  to_profile_id: string;
  status: string;
  created_at: string;
}

export function useFastMatchInterests() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();

  return useQuery({
    queryKey: ["fastmatch-interests", currentWorkspace?.id, profile?.id],
    queryFn: async () => {
      if (!profile) return { sent: [], received: [] };

      const [sentRes, receivedRes] = await Promise.all([
        supabase
          .from("fastmatch_interests")
          .select("*")
          .eq("from_profile_id", profile.id)
          .in("status", ["pending", "mutual"]),
        supabase
          .from("fastmatch_interests")
          .select("*")
          .eq("to_profile_id", profile.id)
          .in("status", ["pending", "mutual"]),
      ]);

      return {
        sent: (sentRes.data || []) as FastMatchInterest[],
        received: (receivedRes.data || []) as FastMatchInterest[],
      };
    },
    enabled: !!profile,
  });
}

export function useSendInterest() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toProfileId: string) => {
      if (!profile || !currentWorkspace) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("fastmatch_interests")
        .insert({
          workspace_id: currentWorkspace.id,
          from_profile_id: profile.id,
          to_profile_id: toProfileId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Check if mutual interest exists
      const { data: reciprocal } = await supabase
        .from("fastmatch_interests")
        .select("id")
        .eq("from_profile_id", toProfileId)
        .eq("to_profile_id", profile.id)
        .eq("status", "pending")
        .maybeSingle();

      if (reciprocal) {
        // Update both to mutual
        await Promise.all([
          supabase.from("fastmatch_interests").update({ status: "mutual" }).eq("id", data.id),
          supabase.from("fastmatch_interests").update({ status: "mutual" }).eq("id", reciprocal.id),
        ]);
        return { mutual: true, interestId: data.id, toProfileId };
      }

      return { mutual: false, interestId: data.id, toProfileId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fastmatch-interests"] });

      emitKernelEvent({
        workspace_id: currentWorkspace!.id,
        type: 'FASTMATCH.SUGGESTED',
        entity_kind: 'fastmatch_interest',
        entity_id: result.interestId,
        source_module: 'crm-fastmatch',
        payload: {
          from_profile_id: profile!.id,
          to_profile_id: result.toProfileId,
          mutual: result.mutual,
        },
      });

      if (result.mutual) {
        console.log('[FASTMATCH] Mutual interest detected');
        toast.success("Interesse mútuo detectado! Pode desbloquear a conexão.");
      } else {
        console.log(`[FASTMATCH] Interest sent: ${result.interestId}`);
        toast.success("Interesse demonstrado com sucesso.");
      }
    },
    onError: (err: any) => {
      console.warn('[FASTMATCH] INTEREST_FAILED', err?.message);
      if (err?.message?.includes("duplicate")) {
        toast.error("Já demonstrou interesse neste perfil.");
      } else {
        toast.error("Erro ao demonstrar interesse.");
      }
    },
  });
}
