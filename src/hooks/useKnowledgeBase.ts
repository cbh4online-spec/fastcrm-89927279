import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  KnowledgeBase, 
  KnowledgeSource, 
  KnowledgeEntry, 
  AIPersona,
  FAQSuggestion,
  KnowledgeMetrics,
  AIResponse 
} from '@/types/knowledge-base';
import { toast } from 'sonner';

export function useKnowledgeBase() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [personas, setPersonas] = useState<AIPersona[]>([]);
  const [faqSuggestions, setFaqSuggestions] = useState<FAQSuggestion[]>([]);
  const [metrics, setMetrics] = useState<KnowledgeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all knowledge bases
  const fetchKnowledgeBases = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to camelCase
      const mapped = (data || []).map(kb => ({
        id: kb.id,
        workspaceId: kb.workspace_id,
        name: kb.name,
        description: kb.description,
        type: kb.type,
        isActive: kb.is_active,
        allowedChannels: kb.allowed_channels,
        createdBy: kb.created_by,
        createdAt: kb.created_at,
        updatedAt: kb.updated_at
      })) as KnowledgeBase[];

      setKnowledgeBases(mapped);
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
    }
  }, [currentWorkspace?.id]);

  // Fetch personas
  const fetchPersonas = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(p => ({
        id: p.id,
        workspaceId: p.workspace_id,
        name: p.name,
        description: p.description,
        personaType: p.persona_type,
        toneOfVoice: p.tone_of_voice,
        technicalDepth: p.technical_depth,
        languageStyle: p.language_style,
        systemPrompt: p.system_prompt,
        limitations: p.limitations,
        knowledgeBaseIds: p.knowledge_base_ids,
        isActive: p.is_active,
        createdBy: p.created_by,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })) as AIPersona[];

      setPersonas(mapped);
    } catch (error) {
      console.error('Error fetching personas:', error);
    }
  }, [currentWorkspace?.id]);

  // Create knowledge base
  const createKnowledgeBase = async (data: Partial<KnowledgeBase>) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data: created, error } = await supabase
        .from('knowledge_bases')
        .insert({
          workspace_id: currentWorkspace.id,
          name: data.name,
          description: data.description,
          type: data.type || 'general',
          is_active: data.isActive ?? true,
          allowed_channels: data.allowedChannels || ['inbox', 'chat', 'email'],
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Base de conhecimento criada');
      await fetchKnowledgeBases();
      return created;
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      toast.error('Erro ao criar base de conhecimento');
      return null;
    }
  };

  // Add source to knowledge base
  const addSource = async (knowledgeBaseId: string, sourceType: string, data: { url?: string; content?: string }) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data: source, error } = await supabase
        .from('knowledge_sources')
        .insert({
          knowledge_base_id: knowledgeBaseId,
          workspace_id: currentWorkspace.id,
          source_type: sourceType,
          source_url: data.url,
          original_content: data.content,
          processing_status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger processing
      processSource(source.id, sourceType, data);

      toast.success('Fonte adicionada. A processar...');
      return source;
    } catch (error) {
      console.error('Error adding source:', error);
      toast.error('Erro ao adicionar fonte');
      return null;
    }
  };

  // Process source with AI
  const processSource = async (sourceId: string, sourceType: string, data: { url?: string; content?: string }) => {
    try {
      // Get knowledge base type
      const { data: source } = await supabase
        .from('knowledge_sources')
        .select('knowledge_base_id')
        .eq('id', sourceId)
        .single();

      const { data: kb } = await supabase
        .from('knowledge_bases')
        .select('type')
        .eq('id', source?.knowledge_base_id)
        .single();

      const { data: result, error } = await supabase.functions.invoke('knowledge-process', {
        body: {
          sourceId,
          sourceType,
          content: data.content,
          url: data.url,
          knowledgeBaseType: kb?.type || 'general'
        }
      });

      if (error) throw error;

      // Update source with processed content
      await supabase
        .from('knowledge_sources')
        .update({
          original_content: result.originalContent,
          processed_content: result.processedContent,
          extracted_topics: result.topics,
          processing_status: 'completed',
          last_processed_at: new Date().toISOString()
        })
        .eq('id', sourceId);

      // Create entries from FAQs
      if (result.faqs && result.faqs.length > 0) {
        const entries = result.faqs.map((faq: any) => ({
          knowledge_base_id: source?.knowledge_base_id,
          source_id: sourceId,
          workspace_id: currentWorkspace?.id,
          entry_type: 'faq',
          title: faq.question,
          question: faq.question,
          content: faq.answer,
          summary: faq.answer.slice(0, 200),
          keywords: result.topics,
          status: 'draft',
          created_by: user?.id
        }));

        await supabase.from('knowledge_entries').insert(entries);
      }

      toast.success('Fonte processada com sucesso');
    } catch (error) {
      console.error('Error processing source:', error);
      await supabase
        .from('knowledge_sources')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', sourceId);
      toast.error('Erro ao processar fonte');
    }
  };

  // Create entry manually
  const createEntry = async (knowledgeBaseId: string, data: Partial<KnowledgeEntry>) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data: entry, error } = await supabase
        .from('knowledge_entries')
        .insert({
          knowledge_base_id: knowledgeBaseId,
          workspace_id: currentWorkspace.id,
          entry_type: data.entryType || 'content',
          title: data.title,
          question: data.question,
          content: data.content,
          summary: data.summary,
          keywords: data.keywords,
          status: 'draft',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Entrada criada');
      return entry;
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Erro ao criar entrada');
      return null;
    }
  };

  // Validate entry
  const validateEntry = async (entryId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('knowledge_entries')
        .update({
          status: 'validated',
          validated_by: user.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', entryId);

      toast.success('Entrada validada');
    } catch (error) {
      console.error('Error validating entry:', error);
      toast.error('Erro ao validar entrada');
    }
  };

  // Query knowledge base with AI
  const queryKnowledge = async (
    query: string, 
    context: string, 
    options?: { personaId?: string; knowledgeBaseIds?: string[] }
  ): Promise<AIResponse | null> => {
    if (!currentWorkspace?.id) return null;

    try {
      // Fetch relevant entries
      let entriesQuery = supabase
        .from('knowledge_entries')
        .select('id, title, content, entry_type')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'validated')
        .limit(20);

      if (options?.knowledgeBaseIds && options.knowledgeBaseIds.length > 0) {
        entriesQuery = entriesQuery.in('knowledge_base_id', options.knowledgeBaseIds);
      }

      const { data: entries } = await entriesQuery;

      // Fetch persona if specified
      let persona = undefined;
      if (options?.personaId) {
        const { data: p } = await supabase
          .from('ai_personas')
          .select('*')
          .eq('id', options.personaId)
          .single();
        
        if (p) {
          persona = {
            name: p.name,
            toneOfVoice: p.tone_of_voice,
            technicalDepth: p.technical_depth,
            systemPrompt: p.system_prompt,
            limitations: p.limitations
          };
        }
      }

      const { data: result, error } = await supabase.functions.invoke('knowledge-query', {
        body: {
          query,
          context,
          knowledgeEntries: (entries || []).map(e => ({
            id: e.id,
            title: e.title,
            content: e.content,
            type: e.entry_type
          })),
          persona
        }
      });

      if (error) throw error;

      // Log usage
      await supabase.from('knowledge_usage_logs').insert({
        workspace_id: currentWorkspace.id,
        persona_id: options?.personaId,
        context,
        query,
        response: result.response,
        response_source: result.responseSource,
        confidence_score: result.confidence,
        response_time_ms: result.responseTimeMs
      });

      return result;
    } catch (error) {
      console.error('Error querying knowledge:', error);
      return null;
    }
  };

  // Create persona
  const createPersona = async (data: Partial<AIPersona>) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data: persona, error } = await supabase
        .from('ai_personas')
        .insert({
          workspace_id: currentWorkspace.id,
          name: data.name,
          description: data.description,
          persona_type: data.personaType,
          tone_of_voice: data.toneOfVoice || 'empático',
          technical_depth: data.technicalDepth || 'medium',
          language_style: data.languageStyle || 'conversational',
          system_prompt: data.systemPrompt,
          limitations: data.limitations,
          knowledge_base_ids: data.knowledgeBaseIds,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Persona criada');
      await fetchPersonas();
      return persona;
    } catch (error) {
      console.error('Error creating persona:', error);
      toast.error('Erro ao criar persona');
      return null;
    }
  };

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const [
        { count: totalBases },
        { count: totalEntries },
        { count: validatedEntries },
        { count: totalQueries },
        { data: usageLogs }
      ] = await Promise.all([
        supabase.from('knowledge_bases').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
        supabase.from('knowledge_entries').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
        supabase.from('knowledge_entries').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id).eq('status', 'validated'),
        supabase.from('knowledge_usage_logs').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
        supabase.from('knowledge_usage_logs').select('response_source, response_time_ms, resulted_in_conversion, resulted_in_meeting').eq('workspace_id', currentWorkspace.id).limit(1000)
      ]);

      const aiResolved = usageLogs?.filter(l => l.response_source === 'knowledge_base').length || 0;
      const avgTime = usageLogs?.length 
        ? usageLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / usageLogs.length 
        : 0;
      const conversions = usageLogs?.filter(l => l.resulted_in_conversion).length || 0;
      const meetings = usageLogs?.filter(l => l.resulted_in_meeting).length || 0;

      setMetrics({
        totalBases: totalBases || 0,
        totalEntries: totalEntries || 0,
        validatedEntries: validatedEntries || 0,
        totalQueries: totalQueries || 0,
        aiResolvedQueries: aiResolved,
        avgResponseTimeMs: Math.round(avgTime),
        conversionsAssisted: conversions,
        meetingsBooked: meetings,
        pendingFAQSuggestions: 0
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, [currentWorkspace?.id]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchKnowledgeBases(),
        fetchPersonas(),
        fetchMetrics()
      ]);
      setIsLoading(false);
    };

    if (currentWorkspace?.id) {
      loadData();
    }
  }, [currentWorkspace?.id, fetchKnowledgeBases, fetchPersonas, fetchMetrics]);

  return {
    // Data
    knowledgeBases,
    personas,
    faqSuggestions,
    metrics,
    isLoading,
    
    // Actions
    createKnowledgeBase,
    addSource,
    createEntry,
    validateEntry,
    createPersona,
    queryKnowledge,
    refresh: () => Promise.all([fetchKnowledgeBases(), fetchPersonas(), fetchMetrics()])
  };
}
