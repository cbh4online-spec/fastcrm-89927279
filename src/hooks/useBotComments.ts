import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface BotCommentJob {
  id: string;
  workspace_id: string;
  product_id: string | null;
  job_type: string;
  content_type: string;
  status: string;
  reviews_count: number;
  qa_count: number;
  result_json: any;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useBotCommentJobs() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["bot-comment-jobs", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from("bot_comment_jobs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as BotCommentJob[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateBotCommentJob() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      jobType = "manual",
      contentType = "both",
      reviewsCount = 3,
      qaCount = 2,
    }: {
      productId: string;
      jobType?: string;
      contentType?: string;
      reviewsCount?: number;
      qaCount?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create job
      const { data: job, error: jobErr } = await (supabase as any)
        .from("bot_comment_jobs")
        .insert({
          workspace_id: currentWorkspace!.id,
          product_id: productId,
          job_type: jobType,
          content_type: contentType,
          reviews_count: reviewsCount,
          qa_count: qaCount,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (jobErr) throw jobErr;

      // Invoke edge function
      const { error: fnErr } = await supabase.functions.invoke("generate-bot-comments", {
        body: { jobId: job.id },
      });
      if (fnErr) throw fnErr;

      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-comment-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["store-reviews-moderation"] });
      toast.success("Comentários gerados com sucesso! Aguardam aprovação.");
    },
    onError: (e: any) => {
      toast.error("Erro ao gerar comentários: " + e.message);
    },
  });
}

export function useProductQA(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-qa", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await (supabase as any)
        .from("product_qa")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useWorkspaceQA(statusFilter: "pending" | "approved" | "all" = "all") {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["workspace-qa", currentWorkspace?.id, statusFilter],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = (supabase as any)
        .from("product_qa")
        .select("*, products!inner(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (statusFilter === "pending") {
        query = query.eq("is_approved", false);
      } else if (statusFilter === "approved") {
        query = query.eq("is_approved", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        product_name: q.products?.name || "Produto removido",
      }));
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useApproveQA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (qaId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("product_qa")
        .update({
          is_approved: true,
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", qaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-qa"] });
      toast.success("Q&A aprovado");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

export function useRejectQA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (qaId: string) => {
      const { error } = await (supabase as any)
        .from("product_qa")
        .delete()
        .eq("id", qaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-qa"] });
      toast.success("Q&A eliminado");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}
