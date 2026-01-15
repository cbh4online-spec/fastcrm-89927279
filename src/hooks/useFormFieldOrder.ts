import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type FormEntityType = "lead" | "contact" | "company" | "opportunity";

export interface FieldConfig {
  id: string;
  name: string;
  type: "native" | "custom";
  fieldType?: string;
  required?: boolean;
  visible: boolean;
  position: number;
}

interface FormLayout {
  entityType: FormEntityType;
  fields: FieldConfig[];
}

// Default native fields for each entity
const DEFAULT_NATIVE_FIELDS: Record<FormEntityType, Omit<FieldConfig, "position" | "visible">[]> = {
  lead: [
    { id: "name", name: "Nome", type: "native", fieldType: "text", required: true },
    { id: "email", name: "Email", type: "native", fieldType: "email" },
    { id: "phone", name: "Telefone", type: "native", fieldType: "phone" },
    { id: "source", name: "Origem", type: "native", fieldType: "select" },
    { id: "status", name: "Estado", type: "native", fieldType: "select" },
    { id: "notes", name: "Notas", type: "native", fieldType: "textarea" },
  ],
  contact: [
    { id: "name", name: "Nome", type: "native", fieldType: "text", required: true },
    { id: "email", name: "Email", type: "native", fieldType: "email" },
    { id: "phone", name: "Telefone", type: "native", fieldType: "phone" },
    { id: "company", name: "Empresa", type: "native", fieldType: "text" },
    { id: "job_title", name: "Cargo", type: "native", fieldType: "text" },
    { id: "tags", name: "Tags", type: "native", fieldType: "text" },
    { id: "notes", name: "Notas", type: "native", fieldType: "textarea" },
  ],
  company: [
    { id: "name", name: "Nome da Empresa", type: "native", fieldType: "text", required: true },
    { id: "tax_id", name: "NIF", type: "native", fieldType: "text" },
    { id: "website", name: "Website", type: "native", fieldType: "text" },
    { id: "email", name: "Email", type: "native", fieldType: "email" },
    { id: "phone", name: "Telefone", type: "native", fieldType: "phone" },
    { id: "industry", name: "Indústria", type: "native", fieldType: "text" },
    { id: "size", name: "Tamanho", type: "native", fieldType: "select" },
    { id: "address", name: "Morada", type: "native", fieldType: "textarea" },
    { id: "tags", name: "Tags", type: "native", fieldType: "text" },
    { id: "notes", name: "Notas", type: "native", fieldType: "textarea" },
  ],
  opportunity: [
    { id: "title", name: "Nome", type: "native", fieldType: "text", required: true },
    { id: "value", name: "Valor (€)", type: "native", fieldType: "number" },
    { id: "stage_id", name: "Fase", type: "native", fieldType: "select" },
    { id: "lead_id", name: "Lead Associado", type: "native", fieldType: "select" },
    { id: "expected_close_date", name: "Data Prevista", type: "native", fieldType: "date" },
    { id: "notes", name: "Notas", type: "native", fieldType: "textarea" },
  ],
};

const STORAGE_KEY_PREFIX = "form_field_order_";

export function useFormFieldOrder(entityType: FormEntityType) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Get layout from localStorage (workspace-specific)
  const getStoredLayout = (): FieldConfig[] | null => {
    if (!currentWorkspace) return null;
    const key = `${STORAGE_KEY_PREFIX}${currentWorkspace.id}_${entityType}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Save layout to localStorage
  const saveLayout = (fields: FieldConfig[]) => {
    if (!currentWorkspace) return;
    const key = `${STORAGE_KEY_PREFIX}${currentWorkspace.id}_${entityType}`;
    localStorage.setItem(key, JSON.stringify(fields));
  };

  // Fetch custom fields
  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields", entityType, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  // Build combined fields list
  const buildFieldsList = (): FieldConfig[] => {
    const storedLayout = getStoredLayout();
    const nativeFields = DEFAULT_NATIVE_FIELDS[entityType];

    // Build custom field configs
    const customFieldConfigs: FieldConfig[] = customFields.map((cf, index) => ({
      id: `custom_${cf.id}`,
      name: cf.name,
      type: "custom" as const,
      fieldType: cf.field_type,
      required: cf.required,
      visible: true,
      position: nativeFields.length + index,
    }));

    // If we have stored layout, use it but ensure all fields exist
    if (storedLayout) {
      const allFieldIds = new Set([
        ...nativeFields.map(f => f.id),
        ...customFieldConfigs.map(f => f.id),
      ]);
      
      // Filter stored layout to only include existing fields
      const validStoredFields = storedLayout.filter(f => allFieldIds.has(f.id));
      const storedIds = new Set(validStoredFields.map(f => f.id));
      
      // Add any new fields that weren't in the stored layout
      const newNativeFields = nativeFields
        .filter(f => !storedIds.has(f.id))
        .map((f, i) => ({ ...f, visible: true, position: validStoredFields.length + i }));
      
      const newCustomFields = customFieldConfigs
        .filter(f => !storedIds.has(f.id))
        .map((f, i) => ({ ...f, position: validStoredFields.length + newNativeFields.length + i }));

      return [...validStoredFields, ...newNativeFields, ...newCustomFields]
        .sort((a, b) => a.position - b.position);
    }

    // No stored layout - use default order: native fields first, then custom
    const allFields: FieldConfig[] = [
      ...nativeFields.map((f, i) => ({ ...f, visible: true, position: i })),
      ...customFieldConfigs,
    ];

    return allFields.sort((a, b) => a.position - b.position);
  };

  const [fields, setFields] = useState<FieldConfig[]>(buildFieldsList);

  // Update fields when custom fields change
  useEffect(() => {
    setFields(buildFieldsList());
  }, [customFields, entityType, currentWorkspace?.id]);

  // Reorder fields
  const reorderFields = (fromIndex: number, toIndex: number) => {
    const updatedFields = [...fields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    
    // Update positions
    const reorderedFields = updatedFields.map((f, i) => ({ ...f, position: i }));
    setFields(reorderedFields);
    saveLayout(reorderedFields);
    
    return reorderedFields;
  };

  // Toggle field visibility
  const toggleFieldVisibility = (fieldId: string) => {
    const updatedFields = fields.map(f => 
      f.id === fieldId ? { ...f, visible: !f.visible } : f
    );
    setFields(updatedFields);
    saveLayout(updatedFields);
  };

  // Reset to default order
  const resetToDefault = () => {
    if (!currentWorkspace) return;
    const key = `${STORAGE_KEY_PREFIX}${currentWorkspace.id}_${entityType}`;
    localStorage.removeItem(key);
    setFields(buildFieldsList());
    toast.success("Ordem dos campos reposta para o padrão");
  };

  // Get only visible fields in order
  const getVisibleFields = () => {
    return fields.filter(f => f.visible).sort((a, b) => a.position - b.position);
  };

  return {
    fields,
    reorderFields,
    toggleFieldVisibility,
    resetToDefault,
    getVisibleFields,
    isLoading: false,
  };
}
