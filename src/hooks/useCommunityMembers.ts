import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommunityMember {
  id: string;
  workspace_id: string;
  user_id: string | null;
  contact_id: string | null;
  email: string;
  name: string;
  status: string;
  invite_token: string | null;
  invite_expires_at: string | null;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
}

export function useCommunityMembers() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["community_members", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("community_members")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CommunityMember[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useInviteCommunityMember() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invites: { email: string; name: string; contactId?: string }[]) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Get community settings for slug
      const { data: settings } = await supabase
        .from("community_settings")
        .select("slug, name, logo_url, primary_color")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (!settings?.slug) throw new Error("Comunidade não tem slug configurado");

      // Call edge function for each invite
      const results = await Promise.allSettled(
        invites.map(async (invite) => {
          const { data, error } = await supabase.functions.invoke("send-community-invite", {
            body: {
              email: invite.email,
              name: invite.name,
              contactId: invite.contactId || null,
              workspaceId: currentWorkspace.id,
              communitySlug: settings.slug,
              communityName: settings.name || "Comunidade",
              communityLogo: (settings as any).logo_url || null,
              primaryColor: (settings as any).primary_color || "#6366f1",
              invitedBy: user.id,
            },
          });
          if (error) throw error;
          return data;
        })
      );

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.error("Some invites failed:", failures);
        if (failures.length === invites.length) throw new Error("Todos os convites falharam");
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community_members", currentWorkspace?.id] });
      const count = variables.length;
      toast.success(`${count} convite${count > 1 ? "s" : ""} enviado${count > 1 ? "s" : ""} com sucesso`);
    },
    onError: (error) => {
      console.error("Error inviting:", error);
      toast.error("Erro ao enviar convites");
    },
  });
}

export function useResendCommunityInvite() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Get the member
      const { data: member, error: mErr } = await supabase
        .from("community_members")
        .select("*")
        .eq("id", memberId)
        .single();

      if (mErr || !member) throw new Error("Membro não encontrado");

      // Get community settings
      const { data: settings } = await supabase
        .from("community_settings")
        .select("slug, name, logo_url, primary_color")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (!settings?.slug) throw new Error("Comunidade sem slug");

      const { error } = await supabase.functions.invoke("send-community-invite", {
        body: {
          email: (member as any).email,
          name: (member as any).name,
          contactId: (member as any).contact_id,
          workspaceId: currentWorkspace.id,
          communitySlug: settings.slug,
          communityName: settings.name || "Comunidade",
          communityLogo: (settings as any).logo_url || null,
          primaryColor: (settings as any).primary_color || "#6366f1",
          invitedBy: user.id,
          resend: true,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community_members", currentWorkspace?.id] });
      toast.success("Convite reenviado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao reenviar convite");
    },
  });
}
