import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { AIAgentSession } from '@/types/ai-assistants';

export function useStartAgentSession() {
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ agent_id, contact_id, lead_id, conversation_id }: {
      agent_id: string;
      contact_id?: string;
      lead_id?: string;
      conversation_id?: string;
    }): Promise<AIAgentSession> => {
      const { data: session, error: sessionErr } = await supabase
        .from('ai_agent_sessions')
        .insert({
          workspace_id: currentWorkspace!.id,
          agent_id,
          contact_id: contact_id ?? null,
          lead_id: lead_id ?? null,
          conversation_id: conversation_id ?? null,
          status: 'active',
        })
        .select()
        .single();
      if (sessionErr) throw sessionErr;

      // Execute first step
      await supabase.functions.invoke('ai-flow-execute', {
        body: { session_id: session.id, workspace_id: currentWorkspace!.id },
      });

      return session as unknown as AIAgentSession;
    },
  });
}

export function useSendFlowMessage() {
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ session_id, user_message }: {
      session_id: string;
      user_message: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-flow-execute', {
        body: { session_id, workspace_id: currentWorkspace!.id, user_message },
      });
      if (error) throw error;
      return data as {
        message: string | null;
        next_node_id: string | null;
        session_complete: boolean;
        context: Record<string, unknown>;
      };
    },
  });
}
