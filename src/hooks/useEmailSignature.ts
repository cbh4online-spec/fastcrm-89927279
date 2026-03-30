import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Hook to load and save the workspace email signature from workspace_settings.
 * The `email_signature_html` column stores a JSON string with { _signatureData, html }.
 */
export function useEmailSignature() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const client = supabase as any;

  const query = useQuery({
    queryKey: ["email-signature", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const { data, error } = await client
        .from("workspace_settings")
        .select("email_signature_html")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data?.email_signature_html as string | null;
    },
    enabled: !!currentWorkspace,
  });

  const mutation = useMutation({
    mutationFn: async (signaturePayload: string) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { error } = await client
        .from("workspace_settings")
        .upsert(
          {
            workspace_id: currentWorkspace.id,
            email_signature_html: signaturePayload,
          },
          { onConflict: "workspace_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-signature", currentWorkspace?.id],
      });
    },
  });

  // Extract just the HTML from the stored JSON payload
  const signatureHtml: string | null = (() => {
    if (!query.data) return null;
    try {
      const parsed: any = JSON.parse(query.data);
      return parsed.html || null;
    } catch {
      return query.data; // plain HTML fallback
    }
  })();

  return {
    signaturePayload: query.data,
    signatureHtml,
    isLoading: query.isLoading,
    saveSignature: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
