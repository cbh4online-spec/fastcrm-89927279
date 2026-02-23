import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PublishRequest {
  productId: string;
  status: "active" | "draft";
  options?: {
    require_min_images?: boolean;
    create_audit_log?: boolean;
    channel?: string;
  };
}

interface PublishResult {
  product_id: string;
  status: string;
  published_at: string | null;
  audit: { log_id: string; event: string } | null;
}

export function useProductPublish() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const publish = useMutation({
    mutationFn: async (request: PublishRequest): Promise<PublishResult> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const { data, error } = await supabase.functions.invoke("product-publish", {
        body: {
          product_id: request.productId,
          status: request.status,
          options: request.options ?? { create_audit_log: true },
        },
        headers: {
          "X-Workspace-Id": currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error?.message || "Failed to publish product");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    publish,
    isPending: publish.isPending,
    isError: publish.isError,
    error: publish.error,
  };
}

export type { PublishRequest, PublishResult };
