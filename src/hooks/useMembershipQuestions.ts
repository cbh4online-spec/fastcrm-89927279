import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MembershipQuestion {
  id: string;
  workspace_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface MembershipAnswer {
  id: string;
  workspace_id: string;
  question_id: string;
  member_id: string | null;
  user_id: string | null;
  answer_text: string;
  created_at: string;
}

export function useMembershipQuestions() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["membership_questions", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await workspaceClient
        .from("community_membership_questions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as MembershipQuestion[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useAddMembershipQuestion() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (q: { question_text: string; question_type: string; options?: string[] }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      // Get max sort_order
      const { data: existing } = await workspaceClient
        .from("community_membership_questions")
        .select("sort_order")
        .eq("workspace_id", currentWorkspace.id)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { error } = await workspaceClient
        .from("community_membership_questions")
        .insert({
          workspace_id: currentWorkspace.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || null,
          sort_order: nextOrder,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_questions", currentWorkspace?.id] });
      toast.success("Pergunta adicionada");
    },
    onError: () => toast.error("Erro ao adicionar pergunta"),
  });
}

export function useUpdateMembershipQuestion() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; question_text?: string; question_type?: string; options?: string[] | null; is_active?: boolean; sort_order?: number }) => {
      const { error } = await workspaceClient
        .from("community_membership_questions")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_questions", currentWorkspace?.id] });
    },
    onError: () => toast.error("Erro ao actualizar pergunta"),
  });
}

export function useDeleteMembershipQuestion() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient
        .from("community_membership_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_questions", currentWorkspace?.id] });
      toast.success("Pergunta removida");
    },
    onError: () => toast.error("Erro ao remover pergunta"),
  });
}

export function useMemberAnswers(memberId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["membership_answers", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await workspaceClient
        .from("community_membership_answers")
        .select("*, community_membership_questions(question_text, question_type)")
        .eq("member_id", memberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });
}

// Public: fetch active questions for a community by slug (for signup flow)
export function usePublicMembershipQuestions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["public_membership_questions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("community_membership_questions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as MembershipQuestion[];
    },
    enabled: !!workspaceId,
  });
}
