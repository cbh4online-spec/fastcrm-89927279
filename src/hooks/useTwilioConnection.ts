import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TwilioConnection {
  id: string;
  workspace_id: string;
  twilio_phone_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTwilioConnection() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["twilio-connection", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("twilio_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as TwilioConnection | null;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSaveTwilioConnection() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      isActive = true,
    }: {
      phoneNumber: string;
      isActive?: boolean;
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      // Upsert
      const { data: existing } = await supabase
        .from("twilio_connections")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("twilio_connections")
          .update({
            twilio_phone_number: phoneNumber,
            is_active: isActive,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("twilio_connections")
          .insert({
            workspace_id: currentWorkspace.id,
            twilio_phone_number: phoneNumber,
            is_active: isActive,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["twilio-connection", currentWorkspace?.id],
      });
      toast.success("Configuração Twilio guardada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao guardar configuração Twilio");
    },
  });
}

export function useDeleteTwilioConnection() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { error } = await supabase
        .from("twilio_connections")
        .delete()
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["twilio-connection", currentWorkspace?.id],
      });
      toast.success("Conexão Twilio removida");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover conexão Twilio");
    },
  });
}
