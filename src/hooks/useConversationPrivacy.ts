import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConversationVisibility = "private" | "shared" | "workspace";

export interface ConversationShare {
  user_id: string;
  granted_by: string | null;
  created_at: string;
}

export function useConversationPrivacy(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const visibilityQuery = useQuery({
    queryKey: ["conversation-visibility", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, visibility, assigned_to, channel, channel_metadata, workspace_id")
        .eq("id", conversationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sharesQuery = useQuery({
    queryKey: ["conversation-shares", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_shared_with" as any)
        .select("user_id, granted_by, created_at")
        .eq("conversation_id", conversationId!);
      if (error) throw error;
      return ((data || []) as unknown) as ConversationShare[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["conversation-visibility", conversationId] });
    queryClient.invalidateQueries({ queryKey: ["conversation-shares", conversationId] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const setVisibility = useMutation({
    mutationFn: async (visibility: ConversationVisibility) => {
      const { error } = await supabase
        .from("conversations")
        .update({ visibility })
        .eq("id", conversationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Privacidade actualizada");
      invalidate();
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const addShare = useMutation({
    mutationFn: async (userId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("conversation_shared_with" as any)
        .insert({
          conversation_id: conversationId!,
          user_id: userId,
          granted_by: userData.user?.id ?? null,
        } as any);
      if (error) throw error;
      // ensure visibility reflects shared state if currently private
      if (visibilityQuery.data?.visibility === "private") {
        await supabase
          .from("conversations")
          .update({ visibility: "shared" })
          .eq("id", conversationId!);
      }
    },
    onSuccess: () => {
      toast.success("Conversa partilhada");
      invalidate();
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const removeShare = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("conversation_shared_with" as any)
        .delete()
        .eq("conversation_id", conversationId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partilha removida");
      invalidate();
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return {
    visibility: (visibilityQuery.data?.visibility as ConversationVisibility | undefined) ?? undefined,
    conversation: visibilityQuery.data,
    shares: sharesQuery.data ?? [],
    isLoading: visibilityQuery.isLoading || sharesQuery.isLoading,
    setVisibility,
    addShare,
    removeShare,
  };
}
