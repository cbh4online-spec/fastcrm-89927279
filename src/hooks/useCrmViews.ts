import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, WorkspaceRole } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export type CrmEntityType = "contacts" | "opportunities";
export type CrmViewMode = "table" | "board";

export interface CrmSavedView {
  id: string;
  workspace_id: string;
  user_id: string | null;
  name: string;
  entity_type: CrmEntityType;
  view_mode: CrmViewMode;
  filters: Record<string, unknown>;
  visible_columns: string[];
  sort_config: Record<string, unknown>;
  is_default: boolean;
  for_role: WorkspaceRole | null;
  created_at: string;
  updated_at: string;
}

export interface CreateViewInput {
  name: string;
  entity_type: CrmEntityType;
  view_mode: CrmViewMode;
  filters?: Record<string, unknown>;
  visible_columns?: string[];
  sort_config?: Record<string, unknown>;
  is_default?: boolean;
  for_role?: WorkspaceRole | null;
  is_workspace_default?: boolean;
}

export interface UpdateViewInput extends Partial<CreateViewInput> {
  id: string;
}

export const ROLE_DEFAULT_VIEWS: Record<WorkspaceRole, { entity: CrmEntityType; mode: CrmViewMode }> = {
  owner: { entity: "opportunities", mode: "board" },
  admin: { entity: "opportunities", mode: "table" },
  agent: { entity: "contacts", mode: "table" },
  viewer: { entity: "contacts", mode: "table" },
};

export const CONTACT_COLUMNS = [
  { key: "name", label: "Nome", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
  { key: "job_title", label: "Cargo" },
  { key: "tags", label: "Tags" },
  { key: "created_at", label: "Criado em" },
];

export const OPPORTUNITY_COLUMNS = [
  { key: "title", label: "Título", required: true },
  { key: "value", label: "Valor" },
  { key: "stage", label: "Etapa" },
  { key: "lead", label: "Lead" },
  { key: "status", label: "Estado" },
  { key: "expected_close_date", label: "Data Prevista" },
  { key: "created_at", label: "Criado em" },
];

export const DEFAULT_CONTACT_COLUMNS = ["name", "email", "phone", "company", "tags", "created_at"];
export const DEFAULT_OPPORTUNITY_COLUMNS = ["title", "value", "stage", "lead", "status", "created_at"];

export function useCrmViews() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const viewsQuery = useQuery({
    queryKey: ["crm-views", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("crm_saved_views")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(view => ({
        ...view,
        visible_columns: Array.isArray(view.visible_columns) ? view.visible_columns : [],
        filters: view.filters || {},
        sort_config: view.sort_config || {},
      })) as CrmSavedView[];
    },
    enabled: !!currentWorkspace,
  });

  const createView = useMutation({
    mutationFn: async (input: CreateViewInput) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("crm_saved_views")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: input.is_workspace_default ? null : user.id,
          name: input.name,
          entity_type: input.entity_type,
          view_mode: input.view_mode,
          filters: (input.filters || {}) as Json,
          visible_columns: (input.visible_columns || []) as Json,
          sort_config: (input.sort_config || {}) as Json,
          is_default: input.is_default || false,
          for_role: input.for_role || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-views", currentWorkspace?.id] });
      toast.success("Vista guardada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating view:", error);
      toast.error("Erro ao guardar vista");
    },
  });

  const updateView = useMutation({
    mutationFn: async ({ id, ...input }: UpdateViewInput) => {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.entity_type !== undefined) updateData.entity_type = input.entity_type;
      if (input.view_mode !== undefined) updateData.view_mode = input.view_mode;
      if (input.filters !== undefined) updateData.filters = input.filters;
      if (input.visible_columns !== undefined) updateData.visible_columns = input.visible_columns;
      if (input.sort_config !== undefined) updateData.sort_config = input.sort_config;
      if (input.is_default !== undefined) updateData.is_default = input.is_default;
      if (input.for_role !== undefined) updateData.for_role = input.for_role;

      const { data, error } = await supabase
        .from("crm_saved_views")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-views", currentWorkspace?.id] });
      toast.success("Vista atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Error updating view:", error);
      toast.error("Erro ao atualizar vista");
    },
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_saved_views")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-views", currentWorkspace?.id] });
      toast.success("Vista eliminada");
    },
    onError: (error) => {
      console.error("Error deleting view:", error);
      toast.error("Erro ao eliminar vista");
    },
  });

  const setAsDefault = useMutation({
    mutationFn: async ({ id, entityType }: { id: string; entityType: CrmEntityType }) => {
      if (!user) throw new Error("Not authenticated");
      
      // First, unset any existing default for this user and entity
      await supabase
        .from("crm_saved_views")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("entity_type", entityType)
        .eq("is_default", true);

      // Then set the new default
      const { data, error } = await supabase
        .from("crm_saved_views")
        .update({ is_default: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-views", currentWorkspace?.id] });
      toast.success("Vista definida como padrão");
    },
    onError: (error) => {
      console.error("Error setting default view:", error);
      toast.error("Erro ao definir vista padrão");
    },
  });

  // Get the appropriate default view for the current user
  const getDefaultView = (entityType: CrmEntityType): CrmSavedView | null => {
    const views = viewsQuery.data || [];
    const userRole = currentWorkspace?.role;

    // 1. User's personal default
    const userDefault = views.find(
      v => v.user_id === user?.id && v.entity_type === entityType && v.is_default
    );
    if (userDefault) return userDefault;

    // 2. Workspace default for user's role
    const roleDefault = views.find(
      v => v.user_id === null && v.entity_type === entityType && v.for_role === userRole && v.is_default
    );
    if (roleDefault) return roleDefault;

    // 3. Workspace-wide default (no role specified)
    const workspaceDefault = views.find(
      v => v.user_id === null && v.entity_type === entityType && v.for_role === null && v.is_default
    );
    if (workspaceDefault) return workspaceDefault;

    return null;
  };

  // Get the user's views (personal + workspace defaults they can see)
  const getUserViews = (entityType?: CrmEntityType) => {
    const views = viewsQuery.data || [];
    return views.filter(v => {
      const matchesEntity = !entityType || v.entity_type === entityType;
      const isPersonal = v.user_id === user?.id;
      const isWorkspaceDefault = v.user_id === null;
      return matchesEntity && (isPersonal || isWorkspaceDefault);
    });
  };

  return {
    views: viewsQuery.data || [],
    isLoading: viewsQuery.isLoading,
    error: viewsQuery.error,
    createView,
    updateView,
    deleteView,
    setAsDefault,
    getDefaultView,
    getUserViews,
  };
}
