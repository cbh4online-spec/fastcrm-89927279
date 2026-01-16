import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import type { 
  ManagedField, 
  CreateManagedFieldInput, 
  UpdateManagedFieldInput,
  FieldEntityType,
  FieldOrigin,
  FormattingConfig,
  FieldPermissions
} from "@/types/fieldManager";

// Helper to normalize field data from DB
function normalizeField(field: Record<string, unknown>): ManagedField {
  const options = field.options;
  let normalizedOptions: string[] = [];
  
  if (Array.isArray(options)) {
    normalizedOptions = options.filter((opt): opt is string => typeof opt === "string");
  } else if (options && typeof options === "object" && "choices" in options) {
    const choices = (options as { choices: unknown }).choices;
    if (Array.isArray(choices)) {
      normalizedOptions = choices.filter((opt): opt is string => typeof opt === "string");
    }
  } else if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) {
        normalizedOptions = parsed.filter((opt): opt is string => typeof opt === "string");
      }
    } catch {
      normalizedOptions = options.split(",").map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    id: field.id as string,
    workspace_id: field.workspace_id as string,
    entity_type: (field.entity_type as string) as FieldEntityType,
    name: field.name as string,
    label: (field.label as string) || (field.name as string),
    internal_name: (field.internal_name as string) || (field.name as string).toLowerCase().replace(/\s+/g, '_'),
    field_type: field.field_type as ManagedField['field_type'],
    options: normalizedOptions,
    required: (field.required as boolean) || false,
    is_unique: (field.is_unique as boolean) || false,
    position: (field.position as number) || 0,
    origin: ((field.origin as string) || 'manual') as FieldOrigin,
    is_visible: field.is_visible !== false,
    section: (field.section as string) || 'general',
    formatting_config: (field.formatting_config as FormattingConfig) || {},
    auto_format: field.auto_format !== false,
    industry_labels: (field.industry_labels as Record<string, string>) || {},
    permissions: (field.permissions as FieldPermissions) || { view: [], edit: [] },
    is_system: (field.is_system as boolean) || false,
    is_archived: (field.is_archived as boolean) || false,
    created_by: field.created_by as string | undefined,
    created_at: field.created_at as string,
    updated_at: field.updated_at as string,
  };
}

// Hook to get all managed fields
export function useManagedFields(entityType?: FieldEntityType, includeArchived = false) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["managed_fields", currentWorkspace?.id, entityType, includeArchived],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("custom_fields")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true });

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(normalizeField);
    },
    enabled: !!currentWorkspace,
  });
}

// Hook to create a managed field
export function useCreateManagedField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreateManagedFieldInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data: sessionData } = await workspaceClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // Get max position
      const { data: existingFields } = await workspaceClient
        .from("custom_fields")
        .select("position")
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", input.entity_type)
        .order("position", { ascending: false })
        .limit(1);

      const maxPosition = existingFields?.[0]?.position ?? -1;

      const internal_name = input.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const insertData: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        entity_type: input.entity_type as string,
        name: input.name,
        label: input.label || input.name,
        internal_name,
        field_type: input.field_type as string,
        options: input.options || [],
        required: input.required || false,
        is_unique: input.is_unique || false,
        position: input.position ?? (maxPosition + 1),
        origin: input.origin || 'manual',
        is_visible: input.is_visible !== false,
        section: input.section || 'general',
        formatting_config: JSON.parse(JSON.stringify(input.formatting_config || {})),
        auto_format: input.auto_format !== false,
        industry_labels: JSON.parse(JSON.stringify(input.industry_labels || {})),
        permissions: JSON.parse(JSON.stringify(input.permissions || { view: [], edit: [] })),
        is_system: false,
        is_archived: false,
        created_by: userId,
      };

      const { data, error } = await workspaceClient
        .from("custom_fields")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await workspaceClient.from("custom_field_audit_logs").insert({
        custom_field_id: data.id,
        workspace_id: currentWorkspace.id,
        action: 'created',
        new_values: data,
        performed_by: userId,
      });

      return normalizeField(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed_fields", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo criado com sucesso");
    },
    onError: (error: Error) => {
      console.error("Error creating field:", error);
      toast.error("Erro ao criar campo");
    },
  });
}

// Hook to update a managed field
export function useUpdateManagedField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateManagedFieldInput) => {
      const { id, ...updates } = input;

      const { data: sessionData } = await workspaceClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // Get current values for audit
      const { data: oldData } = await workspaceClient
        .from("custom_fields")
        .select("*")
        .eq("id", id)
        .single();

      // Cast complex types for Supabase using JSON serialization
      const updateData: Record<string, unknown> = {};
      
      // Copy simple fields
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.label !== undefined) updateData.label = updates.label;
      if (updates.options !== undefined) updateData.options = updates.options;
      if (updates.required !== undefined) updateData.required = updates.required;
      if (updates.is_unique !== undefined) updateData.is_unique = updates.is_unique;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.is_visible !== undefined) updateData.is_visible = updates.is_visible;
      if (updates.section !== undefined) updateData.section = updates.section;
      if (updates.auto_format !== undefined) updateData.auto_format = updates.auto_format;
      if (updates.is_archived !== undefined) updateData.is_archived = updates.is_archived;
      
      // Handle JSONB fields with proper serialization
      if (updates.formatting_config) {
        updateData.formatting_config = JSON.parse(JSON.stringify(updates.formatting_config));
      }
      if (updates.industry_labels) {
        updateData.industry_labels = JSON.parse(JSON.stringify(updates.industry_labels));
      }
      if (updates.permissions) {
        updateData.permissions = JSON.parse(JSON.stringify(updates.permissions));
      }

      const { data, error } = await workspaceClient
        .from("custom_fields")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log the update
      if (currentWorkspace) {
        await workspaceClient.from("custom_field_audit_logs").insert({
          custom_field_id: id,
          workspace_id: currentWorkspace.id,
          action: 'updated',
          old_values: oldData,
          new_values: data,
          performed_by: userId,
        });
      }

      return normalizeField(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed_fields", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo atualizado com sucesso");
    },
    onError: (error: Error) => {
      console.error("Error updating field:", error);
      toast.error("Erro ao atualizar campo");
    },
  });
}

// Hook to archive a field (soft delete)
export function useArchiveField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: sessionData } = await workspaceClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const { error } = await workspaceClient
        .from("custom_fields")
        .update({ is_archived: true })
        .eq("id", id);

      if (error) throw error;

      // Log the archive
      if (currentWorkspace) {
        await workspaceClient.from("custom_field_audit_logs").insert({
          custom_field_id: id,
          workspace_id: currentWorkspace.id,
          action: 'archived',
          performed_by: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed_fields", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo arquivado");
    },
    onError: (error: Error) => {
      console.error("Error archiving field:", error);
      toast.error("Erro ao arquivar campo");
    },
  });
}

// Hook to restore an archived field
export function useRestoreField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: sessionData } = await workspaceClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const { error } = await workspaceClient
        .from("custom_fields")
        .update({ is_archived: false })
        .eq("id", id);

      if (error) throw error;

      if (currentWorkspace) {
        await workspaceClient.from("custom_field_audit_logs").insert({
          custom_field_id: id,
          workspace_id: currentWorkspace.id,
          action: 'restored',
          performed_by: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed_fields", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo restaurado");
    },
    onError: (error: Error) => {
      console.error("Error restoring field:", error);
      toast.error("Erro ao restaurar campo");
    },
  });
}

// Hook to reorder fields
export function useReorderManagedFields() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (fields: { id: string; position: number }[]) => {
      const updates = fields.map(({ id, position }) =>
        workspaceClient
          .from("custom_fields")
          .update({ position })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      
      for (const result of results) {
        if (result.error) throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed_fields", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Ordem atualizada");
    },
    onError: (error: Error) => {
      console.error("Error reordering fields:", error);
      toast.error("Erro ao reordenar campos");
    },
  });
}

// Hook to get audit logs for a field
export function useFieldAuditLogs(fieldId?: string) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["field_audit_logs", fieldId],
    queryFn: async () => {
      if (!fieldId) return [];

      const { data, error } = await workspaceClient
        .from("custom_field_audit_logs")
        .select("*")
        .eq("custom_field_id", fieldId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!fieldId,
  });
}
