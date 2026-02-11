import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2CSellerInvite {
  id: string;
  workspace_id: string;
  email: string;
  name: string;
  message: string | null;
  invite_token: string;
  status: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useC2CSellerInvites(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-invites", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_seller_invites" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as C2CSellerInvite[];
    },
    enabled: !!workspaceId,
  });
}

export function useSendSellerInvite(workspaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (invites: Array<{ email: string; name: string; message?: string }>) => {
      if (!workspaceId || !user) throw new Error("Sem workspace ou utilizador");

      const { data, error } = await supabase.functions.invoke("send-c2c-seller-invite", {
        body: {
          invites,
          workspaceId,
          domain: getPublicBaseUrl(),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar convites");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-invites"] });
      const sent = data.results?.filter((r: any) => r.success).length || 0;
      const failed = data.results?.filter((r: any) => !r.success).length || 0;
      if (failed > 0) {
        toast.warning(`${sent} convite(s) enviado(s), ${failed} falharam`);
      } else {
        toast.success(`${sent} convite(s) enviado(s) com sucesso!`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Erro ao enviar convites"),
  });
}

export function useRevokeSellerInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("c2c_seller_invites" as any)
        .update({ status: "revoked" } as any)
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-invites"] });
      toast.success("Convite revogado");
    },
    onError: () => toast.error("Erro ao revogar convite"),
  });
}

export function useResendSellerInvite(workspaceId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (invite: C2CSellerInvite) => {
      if (!workspaceId || !user) throw new Error("Sem workspace ou utilizador");

      // Delete old invite
      await supabase
        .from("c2c_seller_invites" as any)
        .delete()
        .eq("id", invite.id);

      // Send new invite
      const { data, error } = await supabase.functions.invoke("send-c2c-seller-invite", {
        body: {
          invites: [{ email: invite.email, name: invite.name, message: invite.message }],
          workspaceId,
          domain: window.location.origin,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao reenviar convite");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-invites"] });
      toast.success("Convite reenviado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao reenviar convite"),
  });
}
