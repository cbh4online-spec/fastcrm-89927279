import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ConversationalFormRenderer } from '@/components/smart-forms/ConversationalFormRenderer';
import { StandardFormRenderer } from '@/components/smart-forms/StandardFormRenderer';
import { SmartForm, SmartFormSchema, AutomationConfig, FormSettings, FormType } from '@/types/smartForm';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

function parseJsonField<T>(json: Json | null, defaultValue: T): T {
  if (!json) return defaultValue;
  return json as unknown as T;
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<SmartForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      if (!slug) {
        setError('Formulário não encontrado');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('forms')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .eq('is_internal', false)
          .single();

        if (fetchError || !data) {
          setError('Formulário não encontrado ou inativo');
          return;
        }

        setForm({
          id: data.id,
          workspace_id: data.workspace_id,
          created_by: data.created_by,
          name: data.name,
          description: data.description || undefined,
          form_type: data.form_type as FormType,
          schema: parseJsonField<SmartFormSchema>(data.schema, { 
            fields: [], 
            scoringRules: [], 
            conditions: [], 
            automationConfig: {} as AutomationConfig, 
            settings: { submitButtonText: 'Enviar', successMessage: 'Obrigado!', showProgressBar: true, allowMultipleSubmissions: false, requireAuth: false, theme: 'auto' } as FormSettings 
          }),
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
        });
      } catch (err) {
        console.error('Error fetching form:', err);
        setError('Erro ao carregar formulário');
      } finally {
        setIsLoading(false);
      }
    }

    fetchForm();
  }, [slug]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!form) return;

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('process-form-submission', {
        body: {
          formId: form.id,
          data,
          workspaceId: form.workspace_id,
        },
      });

      if (response.error) {
        throw response.error;
      }

      console.log('Form submitted successfully:', response.data);
    } catch (err) {
      console.error('Error submitting form:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Formulário Indisponível</h1>
          <p className="text-muted-foreground">{error || 'Este formulário não existe ou foi desativado.'}</p>
        </div>
      </div>
    );
  }

  const schema = form.schema;

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      {form.is_conversational ? (
        <ConversationalFormRenderer
          schema={schema}
          formName={form.name}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : (
        <StandardFormRenderer
          schema={schema}
          formName={form.name}
          formDescription={form.description}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
