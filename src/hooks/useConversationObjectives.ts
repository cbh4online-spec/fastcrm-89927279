/**
 * Hook for managing Conversation Objectives
 * CRUD operations for the conversation_objectives table
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ConversationObjective = Database["public"]["Tables"]["conversation_objectives"]["Row"];
type ConversationObjectiveInsert = Database["public"]["Tables"]["conversation_objectives"]["Insert"];
type ConversationObjectiveUpdate = Database["public"]["Tables"]["conversation_objectives"]["Update"];

export function useConversationObjectives(personaId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch all objectives for the workspace, ordered by sort_position
  const {
    data: objectives = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation-objectives", workspaceId, personaId],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("conversation_objectives")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_position", { ascending: true });

      if (personaId) {
        query = query.eq("persona_id", personaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ConversationObjective[];
    },
    enabled: !!workspaceId,
  });

  // Count of active objectives
  const activeObjectivesCount = objectives.filter((obj) => obj.is_active).length;

  // Create objective
  const createObjectiveMutation = useMutation({
    mutationFn: async (data: Omit<ConversationObjectiveInsert, "workspace_id" | "created_by">) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      if (!user?.id) throw new Error("Utilizador não autenticado");

      // Get next sort_position
      const maxPosition = objectives.reduce(
        (max, obj) => Math.max(max, obj.sort_position || 0),
        0
      );

      const { data: newObjective, error } = await supabase
        .from("conversation_objectives")
        .insert({
          ...data,
          workspace_id: workspaceId,
          created_by: user.id,
          sort_position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return newObjective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-objectives", workspaceId],
      });
      toast.success("Objetivo criado com sucesso");
    },
    onError: (error: Error) => {
      console.error("Error creating objective:", error);
      toast.error(`Erro ao criar objetivo: ${error.message}`);
    },
  });

  // Update objective
  const updateObjectiveMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ConversationObjectiveUpdate;
    }) => {
      const { data: updated, error } = await supabase
        .from("conversation_objectives")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-objectives", workspaceId],
      });
      toast.success("Objetivo atualizado com sucesso");
    },
    onError: (error: Error) => {
      console.error("Error updating objective:", error);
      toast.error(`Erro ao atualizar objetivo: ${error.message}`);
    },
  });

  // Delete objective
  const deleteObjectiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conversation_objectives")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-objectives", workspaceId],
      });
      toast.success("Objetivo eliminado com sucesso");
    },
    onError: (error: Error) => {
      console.error("Error deleting objective:", error);
      toast.error(`Erro ao eliminar objetivo: ${error.message}`);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("conversation_objectives")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-objectives", workspaceId],
      });
    },
    onError: (error: Error) => {
      console.error("Error toggling objective:", error);
      toast.error(`Erro ao alterar estado: ${error.message}`);
    },
  });

  // Reorder objectives (batch update sort_position)
  const reorderObjectivesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_position: index + 1,
      }));

      // Update each objective's sort_position
      for (const update of updates) {
        const { error } = await supabase
          .from("conversation_objectives")
          .update({ sort_position: update.sort_position })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-objectives", workspaceId],
      });
    },
    onError: (error: Error) => {
      console.error("Error reordering objectives:", error);
      toast.error(`Erro ao reordenar objetivos: ${error.message}`);
    },
  });

  return {
    objectives,
    activeObjectivesCount,
    isLoading,
    error,
    createObjective: createObjectiveMutation.mutateAsync,
    updateObjective: updateObjectiveMutation.mutateAsync,
    deleteObjective: deleteObjectiveMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    reorderObjectives: reorderObjectivesMutation.mutateAsync,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
  };
}

// CRM field mappings for easy selection
export const CRM_FIELDS = {
  lead: [
    { value: "name", label: "Nome" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telefone" },
    { value: "company_name", label: "Empresa" },
    { value: "status", label: "Estado" },
    { value: "source", label: "Origem" },
    { value: "tags", label: "Tags" },
    { value: "notes", label: "Notas" },
    { value: "custom_fields", label: "Campo Personalizado" },
  ],
  contact: [
    { value: "name", label: "Nome" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telefone" },
    { value: "company", label: "Empresa" },
    { value: "position", label: "Cargo" },
    { value: "notes", label: "Notas" },
    { value: "custom_fields", label: "Campo Personalizado" },
  ],
  opportunity: [
    { value: "title", label: "Título" },
    { value: "value", label: "Valor" },
    { value: "stage", label: "Fase" },
    { value: "probability", label: "Probabilidade" },
    { value: "expected_close_date", label: "Data Prevista" },
    { value: "notes", label: "Notas" },
    { value: "custom_fields", label: "Campo Personalizado" },
  ],
} as const;

export type CrmEntity = keyof typeof CRM_FIELDS;
