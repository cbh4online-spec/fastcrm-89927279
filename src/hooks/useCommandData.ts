import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Shared hook that calls the ask-fastcrm edge function with a specific intent.
 * This allows dashboard widgets to use the same data engine as the AI chat,
 * ensuring consistency between card data and chat answers.
 */
export function useCommandData(intent: string, options?: { enabled?: boolean; staleTime?: number }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["command-data", intent, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.functions.invoke("ask-fastcrm", {
        body: {
          question: intent, // Direct intent passthrough
          conversation_context: { direct_intent: true },
        },
        headers: { "X-Workspace-Id": workspaceId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    enabled: (options?.enabled ?? true) && !!workspaceId,
    staleTime: options?.staleTime ?? 60_000, // 1 min default cache
    refetchOnWindowFocus: false,
  });
}
