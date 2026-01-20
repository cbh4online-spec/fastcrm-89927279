import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  MessageSquare,
  Clock,
  Target
} from "lucide-react";

interface TaskQuickActionsProps {
  entityName: string;
  onQuickAction: (action: string, title: string) => void;
}

const quickActions = [
  {
    id: 'call',
    icon: Phone,
    label: 'Ligar',
    color: 'text-green-600 bg-green-500/10 hover:bg-green-500/20',
    titleTemplate: 'Ligar para {{name}}'
  },
  {
    id: 'email',
    icon: Mail,
    label: 'Email',
    color: 'text-blue-600 bg-blue-500/10 hover:bg-blue-500/20',
    titleTemplate: 'Enviar email para {{name}}'
  },
  {
    id: 'meeting',
    icon: Calendar,
    label: 'Reunião',
    color: 'text-purple-600 bg-purple-500/10 hover:bg-purple-500/20',
    titleTemplate: 'Agendar reunião com {{name}}'
  },
  {
    id: 'proposal',
    icon: FileText,
    label: 'Proposta',
    color: 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20',
    titleTemplate: 'Preparar proposta para {{name}}'
  },
  {
    id: 'message',
    icon: MessageSquare,
    label: 'WhatsApp',
    color: 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20',
    titleTemplate: 'Enviar WhatsApp para {{name}}'
  },
  {
    id: 'followup',
    icon: Clock,
    label: 'Follow-up',
    color: 'text-orange-600 bg-orange-500/10 hover:bg-orange-500/20',
    titleTemplate: 'Follow-up com {{name}}'
  }
];

export function TaskQuickActions({ entityName, onQuickAction }: TaskQuickActionsProps) {
  const handleAction = (action: typeof quickActions[0]) => {
    const title = action.titleTemplate.replace('{{name}}', entityName);
    onQuickAction(action.id, title);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            <CardDescription>
              Criar tarefa com um clique
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                onClick={() => handleAction(action)}
                className={`flex flex-col items-center gap-2 h-auto py-4 ${action.color}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
