/**
 * Agent Card Expanded - Shows agent with autopilot status inline
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  Edit, 
  Trash2, 
  Clock, 
  MessageSquare,
  Users,
  BookOpen,
  Zap,
  Moon
} from "lucide-react";
import { AGENT_CHANNELS, type AIChannelAgent } from "@/types/aiChannelAgents";

interface AgentCardExpandedProps {
  agent: AIChannelAgent;
  personas: Array<{ id: string; name: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export function AgentCardExpanded({
  agent,
  personas,
  knowledgeBases,
  onEdit,
  onDelete,
  onToggleStatus
}: AgentCardExpandedProps) {
  const channelConfig = AGENT_CHANNELS[agent.channel];
  const persona = personas.find(p => p.id === agent.personaId);
  const linkedBases = knowledgeBases.filter(kb => agent.knowledgeBaseIds.includes(kb.id));
  
  const autopilotEnabled = agent.settings?.autopilotEnabled || false;
  const delayMin = agent.settings?.responseDelayMs ? Math.floor(agent.settings.responseDelayMs / 1000) : 8;
  const delayMax = agent.settings?.maxMessagesPerConversation || 25;

  return (
    <Card className={`transition-all ${agent.isActive ? 'border-primary/30' : 'opacity-60'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${channelConfig.bgColor} flex items-center justify-center`}>
              <Bot className={`h-5 w-5 ${channelConfig.color}`} />
            </div>
            <div>
              <h3 className="font-semibold">{agent.name}</h3>
              <p className="text-xs text-muted-foreground">{channelConfig.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={agent.isActive}
              onCheckedChange={onToggleStatus}
            />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        {agent.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* Persona & KBs */}
        <div className="flex flex-wrap gap-2">
          {persona && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {persona.name}
            </Badge>
          )}
          {linkedBases.map(kb => (
            <Badge key={kb.id} variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {kb.name}
            </Badge>
          ))}
        </div>

        {/* Autopilot Status */}
        <div className={`p-3 rounded-lg ${autopilotEnabled ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${autopilotEnabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Auto-Pilot</span>
            </div>
            <Badge variant={autopilotEnabled ? "default" : "secondary"} className="text-xs">
              {autopilotEnabled ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          
          {autopilotEnabled && (
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{delayMin}s delay</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>Max {delayMax} msgs</span>
              </div>
              {agent.settings?.respectWorkingHours && (
                <div className="flex items-center gap-1">
                  <Moon className="h-3 w-3" />
                  <span>Horário</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
