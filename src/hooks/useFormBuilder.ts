import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import type { 
  FormDefinition, 
  FormSubmission, 
  FormTemplate,
  CreateFormInput, 
  UpdateFormInput,
  FormSchema,
  FormStatus
} from "@/types/formBuilder";
import { DEFAULT_FORM_SCHEMA } from "@/types/formBuilder";

// Helper to normalize form data from DB
function normalizeForm(data: Record<string, unknown>): FormDefinition {
  return {
    id: data.id as string,
    workspace_id: data.workspace_id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    slug: data.slug as string | undefined,
    form_type: data.form_type as FormDefinition['form_type'],
    target_entity: data.target_entity as FormDefinition['target_entity'],
    industry_type: (data.industry_type as string) || 'default',
    status: data.status as FormDefinition['status'],
    schema: (data.schema as FormSchema) || DEFAULT_FORM_SCHEMA,
    conditional_logic: (data.conditional_logic as FormDefinition['conditional_logic']) || [],
    submission_actions: (data.submission_actions as FormDefinition['submission_actions']) || {
      createContact: true,
      createOpportunity: false,
      createLead: false,
      tags: [],
      webhooks: [],
    },
    success_message: (data.success_message as string) || 'Obrigado pela submissão!',
    styling: (data.styling as FormDefinition['styling']) || { theme: 'default' },
    is_public: data.is_public !== false,
    submissions_count: (data.submissions_count as number) || 0,
    last_submission_at: data.last_submission_at as string | undefined,
    created_by: data.created_by as string | undefined,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

// Hook to get all forms
export function useForms(status?: FormStatus) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["forms", currentWorkspace?.id, status],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("form_definitions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(normalizeForm);
    },
    enabled: !!currentWorkspace,
  });
}

// Hook to get a single form
export function useForm(formId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["form", formId],
    queryFn: async () => {
      if (!formId) return null;

      const { data, error } = await workspaceClient
        .from("form_definitions")
        .select("*")
        .eq("id", formId)
        .maybeSingle();

      if (error) throw error;
      return data ? normalizeForm(data) : null;
    },
    enabled: !!formId,
  });
}

// Hook to create a form
export function useCreateForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreateFormInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data: sessionData } = await workspaceClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // If using a template, fetch its schema
      let schema = input.schema || DEFAULT_FORM_SCHEMA;
      if (input.template_id) {
        const { data: template } = await workspaceClient
          .from("form_templates")
          .select("schema")
          .eq("id", input.template_id)
          .single();
        
        if (template?.schema) {
          schema = template.schema as unknown as FormSchema;
        }
      }

      // Generate slug
      const slug = input.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const { data, error } = await workspaceClient
        .from("form_definitions")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description,
          slug: `${slug}-${Date.now().toString(36)}`,
          form_type: input.form_type,
          target_entity: input.target_entity,
          industry_type: input.industry_type || 'default',
          status: 'draft',
          schema: JSON.parse(JSON.stringify(schema)),
          created_by: userId,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return normalizeForm(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", currentWorkspace?.id] });
      toast.success("Formulário criado com sucesso");
    },
    onError: (error: Error) => {
      console.error("Error creating form:", error);
      toast.error("Erro ao criar formulário");
    },
  });
}

// Hook to update a form
export function useUpdateForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateFormInput) => {
      const { id, ...updates } = input;

      // Handle JSONB fields
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.success_message !== undefined) updateData.success_message = updates.success_message;
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      
      if (updates.schema) {
        updateData.schema = JSON.parse(JSON.stringify(updates.schema));
      }
      if (updates.conditional_logic) {
        updateData.conditional_logic = JSON.parse(JSON.stringify(updates.conditional_logic));
      }
      if (updates.submission_actions) {
        updateData.submission_actions = JSON.parse(JSON.stringify(updates.submission_actions));
      }
      if (updates.styling) {
        updateData.styling = JSON.parse(JSON.stringify(updates.styling));
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await workspaceClient
        .from("form_definitions")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return normalizeForm(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forms", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["form", data.id] });
      toast.success("Formulário atualizado");
    },
    onError: (error: Error) => {
      console.error("Error updating form:", error);
      toast.error("Erro ao atualizar formulário");
    },
  });
}

// Hook to delete a form
export function useDeleteForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await workspaceClient
        .from("form_definitions")
        .delete()
        .eq("id", formId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", currentWorkspace?.id] });
      toast.success("Formulário eliminado");
    },
    onError: (error: Error) => {
      console.error("Error deleting form:", error);
      toast.error("Erro ao eliminar formulário");
    },
  });
}

// Hook to duplicate a form
export function useDuplicateForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (formId: string) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      // Get the original form
      const { data: original, error: fetchError } = await workspaceClient
        .from("form_definitions")
        .select("*")
        .eq("id", formId)
        .single();

      if (fetchError) throw fetchError;

      const { data: sessionData } = await workspaceClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      // Create duplicate
      const { data, error } = await workspaceClient
        .from("form_definitions")
        .insert({
          workspace_id: currentWorkspace.id,
          name: `${original.name} (cópia)`,
          description: original.description,
          slug: `${original.slug}-copy-${Date.now().toString(36)}`,
          form_type: original.form_type,
          target_entity: original.target_entity,
          industry_type: original.industry_type,
          status: 'draft',
          schema: original.schema,
          conditional_logic: original.conditional_logic,
          submission_actions: original.submission_actions,
          success_message: original.success_message,
          styling: original.styling,
          is_public: false,
          created_by: userId,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return normalizeForm(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", currentWorkspace?.id] });
      toast.success("Formulário duplicado");
    },
    onError: (error: Error) => {
      console.error("Error duplicating form:", error);
      toast.error("Erro ao duplicar formulário");
    },
  });
}

// Hook to get form templates
export function useFormTemplates(industryType?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["form_templates", currentWorkspace?.id, industryType],
    queryFn: async () => {
      let query = workspaceClient
        .from("form_templates")
        .select("*")
        .or(`is_system.eq.true,is_public.eq.true${currentWorkspace ? `,workspace_id.eq.${currentWorkspace.id}` : ''}`);

      if (industryType && industryType !== 'all') {
        query = query.eq("industry_type", industryType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as FormTemplate[];
    },
    enabled: !!currentWorkspace,
  });
}

// Hook to get form submissions
export function useFormSubmissions(formId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["form_submissions", formId],
    queryFn: async () => {
      if (!formId) return [];

      const { data, error } = await workspaceClient
        .from("form_builder_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data as FormSubmission[];
    },
    enabled: !!formId,
  });
}
