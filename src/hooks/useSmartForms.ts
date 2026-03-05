import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { SmartForm, FormSubmission, SmartFormSchema, AutomationConfig, FormSettings, FormType } from "@/types/smartForm";
import { Json } from "@/integrations/supabase/types";
import { emitKernelEvent } from "@/lib/kernelEmitter";

// Helper to safely convert JSON to typed objects
function parseJsonField<T>(json: Json | null, defaultValue: T): T {
  if (!json) return defaultValue;
  return json as unknown as T;
}

export function useSmartForms() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["smart-forms", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((form): SmartForm => ({
        id: form.id,
        workspace_id: form.workspace_id,
        created_by: form.created_by,
        name: form.name,
        description: form.description || undefined,
        form_type: form.form_type as FormType,
        schema: parseJsonField<SmartFormSchema>(form.schema, { fields: [], scoringRules: [], conditions: [], automationConfig: {} as AutomationConfig, settings: {} as FormSettings }),
        scoring_rules: parseJsonField(form.scoring_rules, []),
        conditions: parseJsonField(form.conditions, []),
        automation_config: parseJsonField<AutomationConfig>(form.automation_config, {} as AutomationConfig),
        settings: parseJsonField<FormSettings>(form.settings, {} as FormSettings),
        is_conversational: form.is_conversational || false,
        is_active: form.is_active || true,
        is_internal: form.is_internal || false,
        slug: form.slug || undefined,
        submission_count: form.submission_count || 0,
        conversion_rate: Number(form.conversion_rate) || 0,
        created_at: form.created_at,
        updated_at: form.updated_at,
      }));
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSmartForm(formId: string | undefined) {
  return useQuery({
    queryKey: ["smart-form", formId],
    queryFn: async () => {
      if (!formId) return null;

      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        workspace_id: data.workspace_id,
        created_by: data.created_by,
        name: data.name,
        description: data.description || undefined,
        form_type: data.form_type as FormType,
        schema: parseJsonField<SmartFormSchema>(data.schema, { fields: [], scoringRules: [], conditions: [], automationConfig: {} as AutomationConfig, settings: {} as FormSettings }),
        scoring_rules: parseJsonField(data.scoring_rules, []),
        conditions: parseJsonField(data.conditions, []),
        automation_config: parseJsonField<AutomationConfig>(data.automation_config, {} as AutomationConfig),
        settings: parseJsonField<FormSettings>(data.settings, {} as FormSettings),
        is_conversational: data.is_conversational || false,
        is_active: data.is_active || true,
        is_internal: data.is_internal || false,
        slug: data.slug || undefined,
        submission_count: data.submission_count || 0,
        conversion_rate: Number(data.conversion_rate) || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as SmartForm;
    },
    enabled: !!formId,
  });
}

export function useCreateSmartForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (formData: Partial<SmartForm>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !currentWorkspace?.id) {
        throw new Error("Utilizador ou workspace não encontrado");
      }

      const slug = formData.name
        ? formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
        : 'form-' + Date.now();

      const { data, error } = await supabase
        .from("forms")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: userData.user.id,
          name: formData.name || "Novo Formulário",
          description: formData.description,
          form_type: formData.form_type || "lead_capture",
          schema: formData.schema as unknown as Json || { fields: [] },
          scoring_rules: formData.scoring_rules as unknown as Json || [],
          conditions: formData.conditions as unknown as Json || [],
          automation_config: formData.automation_config as unknown as Json || {},
          settings: formData.settings as unknown as Json || {},
          is_conversational: formData.is_conversational || false,
          is_internal: formData.is_internal || false,
          slug,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["smart-forms"] });
      toast.success("Formulário criado com sucesso!");
      console.log(`[FORMS] Form created: ${data.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FORM.CREATED',
          entity_kind: 'form',
          entity_id: data.id,
          source_module: 'core-forms',
          payload: { name: data.name, form_type: data.form_type, is_conversational: data.is_conversational },
        });
      }
    },
    onError: (error) => {
      console.warn('[FORMS] CREATE_FAILED:', error.message);
      toast.error("Erro ao criar formulário");
    },
  });
}

export function useUpdateSmartForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SmartForm> & { id: string }) => {
      const { data, error } = await supabase
        .from("forms")
        .update({
          name: updates.name,
          description: updates.description,
          form_type: updates.form_type,
          schema: updates.schema as unknown as Json,
          scoring_rules: updates.scoring_rules as unknown as Json,
          conditions: updates.conditions as unknown as Json,
          automation_config: updates.automation_config as unknown as Json,
          settings: updates.settings as unknown as Json,
          is_conversational: updates.is_conversational,
          is_active: updates.is_active,
          is_internal: updates.is_internal,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["smart-forms"] });
      queryClient.invalidateQueries({ queryKey: ["smart-form", data.id] });
      toast.success("Formulário atualizado!");
      console.log(`[FORMS] Form updated: ${data.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FORM.UPDATED',
          entity_kind: 'form',
          entity_id: data.id,
          source_module: 'core-forms',
          payload: { name: data.name, is_active: data.is_active },
        });
      }
    },
    onError: (error) => {
      console.warn('[FORMS] UPDATE_FAILED:', error.message);
      toast.error("Erro ao atualizar formulário");
    },
  });
}

export function useDeleteSmartForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from("forms")
        .delete()
        .eq("id", formId);

      if (error) throw error;
      return formId;
    },
    onSuccess: (formId) => {
      queryClient.invalidateQueries({ queryKey: ["smart-forms"] });
      toast.success("Formulário eliminado!");
      console.log(`[FORMS] Form deleted: ${formId}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FORM.DELETED',
          entity_kind: 'form',
          entity_id: formId,
          source_module: 'core-forms',
        });
      }
    },
    onError: (error) => {
      console.warn('[FORMS] DELETE_FAILED:', error.message);
      toast.error("Erro ao eliminar formulário");
    },
  });
}

export function useFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-submissions", formId],
    queryFn: async () => {
      if (!formId) return [];

      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as FormSubmission[];
    },
    enabled: !!formId,
  });
}

export function useSubmitForm() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ formId, data: formData, workspaceId }: { formId: string; data: Record<string, unknown>; workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("process-form-submission", {
        body: { formId, data: formData, workspaceId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions", variables.formId] });
      queryClient.invalidateQueries({ queryKey: ["smart-forms"] });
      console.log(`[FORMS] Form submitted: ${variables.formId}`, result?.submission);
      if (currentWorkspace?.id && result?.submission) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'FORM.SUBMITTED',
          entity_kind: 'form',
          entity_id: variables.formId,
          source_module: 'core-forms',
          payload: {
            score: result.submission.score,
            temperature: result.submission.temperature,
            leadId: result.submission.leadId,
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[FORMS] SUBMIT_FAILED:', error.message);
      toast.error("Erro ao submeter formulário");
    },
  });
}

export function useGenerateFormWithAI() {
  return useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("generate-smart-form", {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.warn('[FORMS] AI_GENERATE_FAILED:', error.message);
      toast.error("Erro ao gerar formulário com IA");
    },
  });
}
