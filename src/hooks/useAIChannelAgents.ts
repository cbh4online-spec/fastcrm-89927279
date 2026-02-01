import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { 
  AIChannelAgent, 
  AgentChannel, 
  CreateAIAgentData, 
  UpdateAIAgentData 
} from '@/types/aiChannelAgents';

interface UseAIChannelAgentsReturn {
  agents: AIChannelAgent[];
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  fetchAgents: () => Promise<void>;
  fetchAgentByChannel: (channel: AgentChannel) => Promise<AIChannelAgent | null>;
  createAgent: (data: CreateAIAgentData) => Promise<AIChannelAgent | null>;
  updateAgent: (id: string, data: Partial<UpdateAIAgentData>) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  toggleAgentStatus: (id: string) => Promise<boolean>;
  
  // Utilities
  getActiveAgentForChannel: (channel: AgentChannel) => AIChannelAgent | undefined;
  refresh: () => Promise<void>;
}

export function useAIChannelAgents(): UseAIChannelAgentsReturn {
  const { currentWorkspace } = useWorkspace();
  const [agents, setAgents] = useState<AIChannelAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = currentWorkspace?.id;

  // Transform DB row to AIChannelAgent type
  const transformAgent = (row: any): AIChannelAgent => ({
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | null,
    channel: row.channel as AgentChannel,
    personaId: row.persona_id as string | null,
    knowledgeBaseIds: (row.knowledge_base_ids as string[]) || [],
    flowId: row.flow_id as string | null,
    isActive: row.is_active as boolean,
    priority: row.priority as number,
    settings: row.settings || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    persona: row.ai_personas ? {
      id: row.ai_personas.id as string,
      name: row.ai_personas.name as string,
      toneOfVoice: row.ai_personas.tone_of_voice as string,
    } : undefined,
    flow: row.conversational_flows ? {
      id: row.conversational_flows.id as string,
      name: row.conversational_flows.name as string,
    } : undefined,
  });

  // Fetch all agents for workspace
  const fetchAgents = useCallback(async () => {
    if (!workspaceId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await (supabase
        .from('ai_agents' as any)
        .select(`
          *,
          ai_personas:persona_id (id, name, tone_of_voice),
          conversational_flows:flow_id (id, name)
        `)
        .eq('workspace_id', workspaceId)
        .order('channel', { ascending: true })
        .order('priority', { ascending: true }) as any);

      if (fetchError) throw fetchError;

      const transformedAgents = (data || []).map(transformAgent);
      setAgents(transformedAgents);
    } catch (err) {
      console.error('Error fetching AI agents:', err);
      setError('Erro ao carregar agentes');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Fetch agent by channel
  const fetchAgentByChannel = useCallback(async (channel: AgentChannel): Promise<AIChannelAgent | null> => {
    if (!workspaceId) return null;
    
    try {
      const { data, error: fetchError } = await (supabase
        .from('ai_agents' as any)
        .select(`
          *,
          ai_personas:persona_id (id, name, tone_of_voice),
          conversational_flows:flow_id (id, name)
        `)
        .eq('workspace_id', workspaceId)
        .eq('channel', channel)
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(1)
        .maybeSingle() as any);

      if (fetchError) throw fetchError;

      return data ? transformAgent(data) : null;
    } catch (err) {
      console.error('Error fetching agent by channel:', err);
      return null;
    }
  }, [workspaceId]);

  // Create new agent
  const createAgent = useCallback(async (data: CreateAIAgentData): Promise<AIChannelAgent | null> => {
    if (!workspaceId) {
      toast.error('Workspace não selecionado');
      return null;
    }

    try {
      const insertData = {
        workspace_id: workspaceId,
        name: data.name,
        description: data.description || null,
        channel: data.channel,
        persona_id: data.personaId || null,
        knowledge_base_ids: data.knowledgeBaseIds || [],
        flow_id: data.flowId || null,
        is_active: data.isActive ?? true,
        priority: data.priority ?? 0,
        settings: data.settings || {},
      };

      const { data: newAgent, error: insertError } = await (supabase
        .from('ai_agents' as any)
        .insert(insertData)
        .select(`
          *,
          ai_personas:persona_id (id, name, tone_of_voice),
          conversational_flows:flow_id (id, name)
        `)
        .single() as any);

      if (insertError) throw insertError;

      const transformed = transformAgent(newAgent);
      setAgents(prev => [...prev, transformed]);
      toast.success('Agente criado com sucesso!');
      return transformed;
    } catch (err) {
      console.error('Error creating agent:', err);
      toast.error('Erro ao criar agente');
      return null;
    }
  }, [workspaceId]);

  // Update agent
  const updateAgent = useCallback(async (id: string, data: Partial<UpdateAIAgentData>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.channel !== undefined) updateData.channel = data.channel;
      if (data.personaId !== undefined) updateData.persona_id = data.personaId;
      if (data.knowledgeBaseIds !== undefined) updateData.knowledge_base_ids = data.knowledgeBaseIds;
      if (data.flowId !== undefined) updateData.flow_id = data.flowId;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.settings !== undefined) updateData.settings = data.settings;
      
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await (supabase
        .from('ai_agents' as any)
        .update(updateData)
        .eq('id', id) as any);

      if (updateError) throw updateError;

      await fetchAgents();
      toast.success('Agente atualizado!');
      return true;
    } catch (err) {
      console.error('Error updating agent:', err);
      toast.error('Erro ao atualizar agente');
      return false;
    }
  }, [fetchAgents]);

  // Delete agent
  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await (supabase
        .from('ai_agents' as any)
        .delete()
        .eq('id', id) as any);

      if (deleteError) throw deleteError;

      setAgents(prev => prev.filter(a => a.id !== id));
      toast.success('Agente removido!');
      return true;
    } catch (err) {
      console.error('Error deleting agent:', err);
      toast.error('Erro ao remover agente');
      return false;
    }
  }, []);

  // Toggle agent status
  const toggleAgentStatus = useCallback(async (id: string): Promise<boolean> => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return false;

    return updateAgent(id, { isActive: !agent.isActive });
  }, [agents, updateAgent]);

  // Get active agent for channel (from local state)
  const getActiveAgentForChannel = useCallback((channel: AgentChannel): AIChannelAgent | undefined => {
    return agents
      .filter(a => a.channel === channel && a.isActive)
      .sort((a, b) => a.priority - b.priority)[0];
  }, [agents]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchAgents();
  }, [fetchAgents]);

  // Auto-load on workspace change
  useEffect(() => {
    if (workspaceId) {
      fetchAgents();
    }
  }, [workspaceId, fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    fetchAgentByChannel,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    getActiveAgentForChannel,
    refresh,
  };
}
