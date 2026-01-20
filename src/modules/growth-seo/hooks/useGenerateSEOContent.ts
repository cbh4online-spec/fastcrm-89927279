import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EntityType, Intent } from '../types';

interface GenerateContentParams {
  entity_type: EntityType;
  topic: string;
  intent?: Intent;
  language?: string;
  additional_context?: string;
}

interface GeneratedSEOContent {
  title: string;
  meta_description: string;
  h1: string;
  tldr: string;
  sections: Array<{
    id: string;
    heading: string;
    content: string;
    type: "text" | "list" | "steps";
    items?: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    type: string;
    text: string;
    url: string;
  };
  schema_markup: Record<string, unknown>;
}

interface GenerateContentResult {
  success: boolean;
  content?: GeneratedSEOContent;
  metadata?: {
    entity_type: EntityType;
    slug: string;
    intent: Intent;
    language: string;
    generated_at: string;
  };
  error?: string;
}

export function useGenerateSEOContent() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = async (params: GenerateContentParams): Promise<GenerateContentResult | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('generate-seo-content', {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate content');
      }

      return response.data as GenerateContentResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedContent = async (
    content: GeneratedSEOContent,
    metadata: { entity_type: EntityType; slug: string; intent: Intent; language: string },
    workspaceId?: string
  ) => {
    try {
      const { data, error: insertError } = await supabase
        .from('seo_entities')
        .insert([{
          workspace_id: workspaceId || null,
          entity_type: metadata.entity_type,
          slug: metadata.slug,
          title: content.title,
          meta_description: content.meta_description,
          h1: content.h1,
          tldr: content.tldr,
          content: JSON.parse(JSON.stringify({
            sections: content.sections,
            faqs: content.faqs,
            cta: content.cta,
          })),
          intent: metadata.intent,
          status: 'draft' as const,
          schema_markup: content.schema_markup ? JSON.parse(JSON.stringify(content.schema_markup)) : null,
          language: metadata.language,
          priority: 0.5,
          change_frequency: 'weekly',
          ai_generated_at: new Date().toISOString(),
          ai_quality_score: 0.8,
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save content';
      setError(errorMessage);
      return null;
    }
  };

  return {
    generateContent,
    saveGeneratedContent,
    isGenerating,
    error,
  };
}
