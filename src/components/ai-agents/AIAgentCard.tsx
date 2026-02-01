import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  MessageCircle, 
  Phone, 
  Instagram, 
  Facebook, 
  Mail, 
  MessageSquare,
  Headphones,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Workflow
} from 'lucide-react';
import type { AIChannelAgent, AgentChannel } from '@/types/aiChannelAgents';
import { getChannelConfig } from '@/types/aiChannelAgents';

interface AIAgentCardProps {
  agent: AIChannelAgent;
  onEdit: (agent: AIChannelAgent) => void;
  onDelete: (agent: AIChannelAgent) => void;
  onToggleStatus: (agent: AIChannelAgent) => void;
}

const channelIcons: Record<AgentChannel, React.ReactNode> = {
  widget: <MessageCircle className="h-5 w-5" />,
  whatsapp: <Phone className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  sms: <MessageSquare className="h-5 w-5" />,
  live_chat: <Headphones className="h-5 w-5" />,
};

export function AIAgentCard({ agent, onEdit, onDelete, onToggleStatus }: AIAgentCardProps) {
  const channelConfig = getChannelConfig(agent.channel);

  return (
    <Card className={`hover:border-primary/50 transition-all ${!agent.isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Channel Icon & Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2.5 rounded-lg ${channelConfig.bgColor} ${channelConfig.color} shrink-0`}>
              {channelIcons[agent.channel]}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                <Badge variant={agent.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {agent.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {channelConfig.label}
              </p>
              
              {agent.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                  {agent.description}
                </p>
              )}
              
              {/* Associated resources */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {agent.persona && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{agent.persona.name}</span>
                  </div>
                )}
                
                {agent.knowledgeBaseIds.length > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span>{agent.knowledgeBaseIds.length} KB{agent.knowledgeBaseIds.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {agent.flow && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Workflow className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{agent.flow.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={agent.isActive}
              onCheckedChange={() => onToggleStatus(agent)}
              className="mr-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(agent)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(agent)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
