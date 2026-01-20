import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SEOEntity, SEOComparison, EntityType } from '../types';

export function useSEOEntity(entityType: EntityType, slug: string, language = 'pt') {
  return useQuery({
    queryKey: ['seo-entity', entityType, slug, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_entities')
        .select('*')
        .eq('entity_type', entityType)
        .eq('slug', slug)
        .eq('language', language)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      
      // Increment view count (fire and forget)
      supabase
        .from('seo_entities')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id)
        .then(() => {});

      return data as SEOEntity;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSEOEntitiesList(entityType: EntityType, options?: {
  language?: string;
  limit?: number;
  offset?: number;
  intent?: string;
}) {
  const { language = 'pt', limit = 50, offset = 0, intent } = options || {};

  return useQuery({
    queryKey: ['seo-entities-list', entityType, language, limit, offset, intent],
    queryFn: async () => {
      let query = supabase
        .from('seo_entities')
        .select('*', { count: 'exact' })
        .eq('entity_type', entityType)
        .eq('language', language)
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .range(offset, offset + limit - 1);

      if (intent) {
        query = query.eq('intent', intent);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { entities: data as SEOEntity[], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSEOComparison(slug: string) {
  return useQuery({
    queryKey: ['seo-comparison', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_comparisons')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      
      // Increment view count
      supabase
        .from('seo_comparisons')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id)
        .then(() => {});

      return data as unknown as SEOComparison;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSEOComparisonsList(options?: {
  limit?: number;
  offset?: number;
}) {
  const { limit = 50, offset = 0 } = options || {};

  return useQuery({
    queryKey: ['seo-comparisons-list', limit, offset],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('seo_comparisons')
        .select('*', { count: 'exact' })
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { comparisons: data as unknown as SEOComparison[], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRelatedEntities(entityType: EntityType, currentSlug: string, limit = 5) {
  return useQuery({
    queryKey: ['related-entities', entityType, currentSlug, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_entities')
        .select('id, title, slug, tldr, entity_type')
        .eq('entity_type', entityType)
        .eq('status', 'published')
        .neq('slug', currentSlug)
        .order('views_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Pick<SEOEntity, 'id' | 'title' | 'slug' | 'tldr' | 'entity_type'>[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useSEOFAQs(entityId: string) {
  return useQuery({
    queryKey: ['seo-faqs', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_faqs')
        .select('*')
        .eq('entity_id', entityId)
        .order('position');

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
    staleTime: 10 * 60 * 1000,
  });
}
