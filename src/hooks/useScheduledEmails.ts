import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduleEmailParams {
  connectionId: string;
  conversationId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  isHtml: boolean;
  attachments?: Array<{ name: string; url: string }>;
  scheduledFor: Date;
}

export function useScheduleEmail() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const client = supabase as any;

  return useMutation({
    mutationFn: async (params: ScheduleEmailParams) => {
      if (!currentWorkspace || !user) throw new Error("Workspace não disponível");

      const { error } = await client
        .from("scheduled_emails")
        .insert({
          workspace_id: currentWorkspace.id,
          connection_id: params.connectionId,
          conversation_id: params.conversationId,
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName,
          subject: params.subject,
          body: params.body,
          is_html: params.isHtml,
          attachments: params.attachments || [],
          scheduled_for: params.scheduledFor.toISOString(),
          status: "pending",
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] });
    },
  });
}
