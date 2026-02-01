import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Bot, Filter } from 'lucide-react';
import { AIAgentCard } from './AIAgentCard';
import type { AIChannelAgent, AgentChannel } from '@/types/aiChannelAgents';
import { AGENT_CHANNELS } from '@/types/aiChannelAgents';

interface AIAgentListProps {
  agents: AIChannelAgent[];
  isLoading: boolean;
  onEdit: (agent: AIChannelAgent) => void;
  onDelete: (agent: AIChannelAgent) => void;
  onToggleStatus: (agent: AIChannelAgent) => void;
  onCreateNew: () => void;
}

type FilterTab = 'all' | AgentChannel;

export function AIAgentList({
  agents,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreateNew,
}: AIAgentListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Get unique channels from agents
  const usedChannels = [...new Set(agents.map(a => a.channel))];

  // Filter agents by channel
  const filteredAgents = activeFilter === 'all' 
    ? agents 
    : agents.filter(a => a.channel === activeFilter);

  // Group agents by channel for display
  const agentsByChannel = filteredAgents.reduce((acc, agent) => {
    if (!acc[agent.channel]) {
      acc[agent.channel] = [];
    }
    acc[agent.channel].push(agent);
    return acc;
  }, {} as Record<AgentChannel, AIChannelAgent[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter and action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {usedChannels.length > 1 && (
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">
                <Filter className="h-3 w-3 mr-1" />
                Todos ({agents.length})
              </TabsTrigger>
              {usedChannels.map(channel => (
                <TabsTrigger key={channel} value={channel} className="text-xs px-3">
                  {AGENT_CHANNELS[channel].label} ({agents.filter(a => a.channel === channel).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Agente
        </Button>
      </div>

      {/* Empty state */}
      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Nenhum agente configurado</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Crie agentes IA para cada canal de comunicação com personas e bases de conhecimento específicas.
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      ) : filteredAgents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum agente encontrado para este filtro.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Agents grid grouped by channel */
        <div className="space-y-6">
          {Object.entries(agentsByChannel).map(([channel, channelAgents]) => (
            <div key={channel}>
              {activeFilter === 'all' && usedChannels.length > 1 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {AGENT_CHANNELS[channel as AgentChannel].label}
                </h3>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {channelAgents.map(agent => (
                  <AIAgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
