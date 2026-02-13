/**
 * Agents Tab - List and manage AI agents with inline autopilot config
 */

import { useState } from "react";
import { useAIChannelAgents } from "@/hooks/useAIChannelAgents";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useConversationalFlows } from "@/hooks/useConversationalFlows";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Bot } from "lucide-react";
import { AgentCardExpanded } from "./AgentCardExpanded";
import { AgentFullForm } from "./AgentFullForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AIChannelAgent } from "@/types/aiChannelAgents";
import { AGENT_CHANNELS } from "@/types/aiChannelAgents";

interface AgentsTabProps {
  searchValue: string;
}

export function AgentsTab({ searchValue }: AgentsTabProps) {
  const { 
    agents, 
    isLoading, 
    createAgent, 
    updateAgent, 
    deleteAgent, 
    toggleAgentStatus 
  } = useAIChannelAgents();
  
  const { personas, knowledgeBases } = useKnowledgeBase();
  const { flows } = useConversationalFlows();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIChannelAgent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AIChannelAgent | null>(null);

  // Filter agents by search
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
    AGENT_CHANNELS[agent.channel]?.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Group by channel
  const agentsByChannel = filteredAgents.reduce((acc, agent) => {
    if (!acc[agent.channel]) {
      acc[agent.channel] = [];
    }
    acc[agent.channel].push(agent);
    return acc;
  }, {} as Record<string, AIChannelAgent[]>);

  const handleCreate = async (data: any) => {
    await createAgent(data);
    setShowCreateDialog(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingAgent) return;
    await updateAgent(editingAgent.id, data);
    setEditingAgent(null);
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    await deleteAgent(deletingAgent.id);
    setDeletingAgent(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {/* Empty State */}
      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum agente configurado</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Crie agentes IA personalizados para cada canal. Configure personas, 
              bases de conhecimento e autopilot tudo num único lugar.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      ) : filteredAgents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum agente encontrado para "{searchValue}"
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Agents grouped by channel */
        <div className="space-y-8">
          {Object.entries(agentsByChannel).map(([channel, channelAgents]) => (
            <div key={channel}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-8 w-8 rounded-lg ${AGENT_CHANNELS[channel as keyof typeof AGENT_CHANNELS]?.bgColor} flex items-center justify-center`}>
                  <Bot className={`h-4 w-4 ${AGENT_CHANNELS[channel as keyof typeof AGENT_CHANNELS]?.color}`} />
                </div>
                <h3 className="font-semibold">
                  {AGENT_CHANNELS[channel as keyof typeof AGENT_CHANNELS]?.label}
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({channelAgents.length})
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {channelAgents.map(agent => (
                  <AgentCardExpanded
                    key={agent.id}
                    agent={agent}
                    allAgents={agents}
                    personas={personas.map(p => ({ id: p.id, name: p.name }))}
                    knowledgeBases={knowledgeBases.map(kb => ({ id: kb.id, name: kb.name }))}
                    onEdit={() => setEditingAgent(agent)}
                    onDelete={() => setDeletingAgent(agent)}
                    onToggleStatus={() => toggleAgentStatus(agent.id)}
                    onUpdateGoalConfig={async (agentId, config) => {
                      await updateAgent(agentId, { settings: { ...agents.find(a => a.id === agentId)?.settings, goalConfig: config } } as any);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Agente</DialogTitle>
          </DialogHeader>
          <AgentFullForm
            personas={personas}
            knowledgeBases={knowledgeBases}
            flows={flows}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agente</DialogTitle>
          </DialogHeader>
          {editingAgent && (
            <AgentFullForm
              agent={editingAgent}
              personas={personas}
              knowledgeBases={knowledgeBases}
              flows={flows}
              onSubmit={handleUpdate}
              onCancel={() => setEditingAgent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O agente "{deletingAgent?.name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
