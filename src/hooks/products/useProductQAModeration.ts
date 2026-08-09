import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export type QAStatusFilter = "pending" | "answered" | "published" | "all";

export interface ProductQAItem {
  id: string;
  workspace_id: string;
  product_id: string;
  question: string;
  answer: string | null;
  asker_name: string | null;
  source: string | null;
  is_approved: boolean;
  moderated_at: string | null;
  created_at: string;
  products?: { name: string | null; sku: string | null } | null;
}

interface Params {
  status: QAStatusFilter;
  search?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}

/** Lista paginada (server-side) de perguntas para moderação. */
export function useProductQAModeration({ status, search, productId, page = 1, pageSize = 20 }: Params) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["product-qa-moderation", wsId, status, search || "", productId || "", page, pageSize],
    enabled: !!wsId,
    queryFn: async () => {
      let q = sb
        .from("product_qa")
        .select("id, workspace_id, product_id, question, answer, asker_name, source, is_approved, moderated_at, created_at, products(name, sku)", {
          count: "exact",
        })
        .eq("workspace_id", wsId);

      if (productId) q = q.eq("product_id", productId);
      if (status === "pending") q = q.eq("is_approved", false).is("answer", null);
      if (status === "answered") q = q.eq("is_approved", false).not("answer", "is", null);
      if (status === "published") q = q.eq("is_approved", true);
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`question.ilike.${term},answer.ilike.${term}`);
      }

      const from = (page - 1) * pageSize;
      const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      return { items: (data || []) as ProductQAItem[], total: count || 0 };
    },
  });
}

/** Contador de perguntas por moderar (badge). */
export function usePendingQACount() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["product-qa-pending-count", wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await sb
        .from("product_qa")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("is_approved", false)
        .is("answer", null);
      if (error) throw error;
      return count || 0;
    },
  });
}

function useInvalidateQA() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["product-qa-moderation"] });
    qc.invalidateQueries({ queryKey: ["product-qa-pending-count"] });
    qc.invalidateQueries({ queryKey: ["store-product-qa"] });
  };
}

/** Guarda resposta e/ou estado de publicação, com registo de moderação. */
export function useModerateQA() {
  const invalidate = useInvalidateQA();

  return useMutation({
    mutationFn: async (input: { id: string; answer?: string | null; is_approved?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload: Record<string, any> = {
        moderated_by: userData?.user?.id ?? null,
        moderated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (input.answer !== undefined) payload.answer = input.answer?.trim() ? input.answer.trim() : null;
      if (input.is_approved !== undefined) payload.is_approved = input.is_approved;

      const { error } = await sb.from("product_qa").update(payload).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pergunta atualizada");
    },
    onError: (error: any) => toast.error("Erro ao atualizar: " + (error?.message || "tente novamente")),
  });
}

export function useDeleteQA() {
  const invalidate = useInvalidateQA();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("product_qa").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pergunta eliminada");
    },
    onError: (error: any) => toast.error("Erro ao eliminar: " + (error?.message || "tente novamente")),
  });
}
