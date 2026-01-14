import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";

export type CustomFieldType = "text" | "number" | "date" | "boolean" | "select";
export type CustomFieldEntityType = "lead" | "opportunity" | "contact" | "company";

export interface CustomField {
  id: string;
  workspace_id: string;
  entity_type: CustomFieldEntityType;
  name: string;
  field_type: CustomFieldType;
  options: string[];
  required: boolean;
  is_unique: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomFieldInput {
  entity_type: CustomFieldEntityType;
  name: string;
  field_type: CustomFieldType;
  options?: string[];
  required?: boolean;
  is_unique?: boolean;
  position?: number;
}

export interface UpdateCustomFieldInput {
  id: string;
  name?: string;
  options?: string[];
  required?: boolean;
  is_unique?: boolean;
  position?: number;
}


// Hook to get custom fields for an entity type
export function useCustomFields(entityType?: CustomFieldEntityType) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["custom_fields", currentWorkspace?.id, entityType],
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

      const { data, error } = await query;

      if (error) throw error;
      return data as CustomField[];
    },
    enabled: !!currentWorkspace,
  });
}

// Hook to create a custom field
export function useCreateCustomField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreateCustomFieldInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await workspaceClient
        .from("custom_fields")
        .insert({
          workspace_id: currentWorkspace.id,
          entity_type: input.entity_type,
          name: input.name,
          field_type: input.field_type,
          options: input.options || [],
          required: input.required || false,
          is_unique: input.is_unique || false,
          position: input.position || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo personalizado criado");
    },
    onError: (error: Error) => {
      console.error("Error creating custom field:", error);
      toast.error("Erro ao criar campo personalizado");
    },
  });
}

// Hook to update a custom field
export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateCustomFieldInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("custom_fields")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo personalizado atualizado");
    },
    onError: (error: Error) => {
      console.error("Error updating custom field:", error);
      toast.error("Erro ao atualizar campo personalizado");
    },
  });
}

// Hook to delete a custom field
export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient
        .from("custom_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Campo personalizado eliminado");
    },
    onError: (error: Error) => {
      console.error("Error deleting custom field:", error);
      toast.error("Erro ao eliminar campo personalizado");
    },
  });
}

// Hook to reorder custom fields (update positions in batch)
export function useReorderCustomFields() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (fields: { id: string; position: number }[]) => {
      // Update each field's position
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
      queryClient.invalidateQueries({ queryKey: ["custom_fields", currentWorkspace?.id] });
      toast.success("Ordem dos campos atualizada");
    },
    onError: (error: Error) => {
      console.error("Error reordering custom fields:", error);
      toast.error("Erro ao reordenar campos");
    },
  });
}

// Hook to get custom field values for an entity
export function useCustomFieldValues(entityId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["custom_field_values", entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await workspaceClient
        .from("custom_field_values")
        .select("*, custom_field:custom_fields(*)")
        .eq("entity_id", entityId);

      if (error) throw error;
      return data as (CustomFieldValue & { custom_field: CustomField })[];
    },
    enabled: !!entityId,
  });
}

// Hook to set a custom field value with uniqueness validation
export function useSetCustomFieldValue() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ 
      customFieldId, 
      entityId, 
      value,
      fieldName,
      isUnique
    }: { 
      customFieldId: string; 
      entityId: string; 
      value: unknown;
      fieldName?: string;
      isUnique?: boolean;
    }) => {
      // Check for uniqueness if the field requires it
      if (isUnique && value !== null && value !== undefined && value !== "") {
        const { data: existingValues, error: checkError } = await workspaceClient
          .from("custom_field_values")
          .select("entity_id")
          .eq("custom_field_id", customFieldId)
          .eq("value", value as never)
          .neq("entity_id", entityId);

        if (checkError) throw checkError;

        if (existingValues && existingValues.length > 0) {
          throw new Error(`O valor "${value}" já existe no campo "${fieldName || 'personalizado'}". Este campo não permite duplicados.`);
        }
      }

      // Upsert the value
      const { data, error } = await workspaceClient
        .from("custom_field_values")
        .upsert(
          {
            custom_field_id: customFieldId,
            entity_id: entityId,
            value: value as never,
          },
          {
            onConflict: "custom_field_id,entity_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as CustomFieldValue;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom_field_values", variables.entityId] });
    },
    onError: (error: Error) => {
      console.error("Error setting custom field value:", error);
      toast.error(error.message || "Erro ao guardar valor do campo");
    },
  });
}

// Hook to get all custom field values for multiple entities (for list views)
export function useCustomFieldValuesForEntities(entityIds: string[]) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["custom_field_values_bulk", entityIds],
    queryFn: async () => {
      if (!entityIds.length) return [];

      const { data, error } = await workspaceClient
        .from("custom_field_values")
        .select("*, custom_field:custom_fields(*)")
        .in("entity_id", entityIds);

      if (error) throw error;
      
      // Group by entity_id for easy lookup
      const grouped: Record<string, (CustomFieldValue & { custom_field: CustomField })[]> = {};
      for (const value of data) {
        if (!grouped[value.entity_id]) {
          grouped[value.entity_id] = [];
        }
        grouped[value.entity_id].push(value as CustomFieldValue & { custom_field: CustomField });
      }
      
      return grouped;
    },
    enabled: entityIds.length > 0,
  });
}
