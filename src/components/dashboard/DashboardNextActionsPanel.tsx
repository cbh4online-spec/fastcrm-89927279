import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowRight,
  Users,
  MessageSquare,
  Target,
  CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextAction } from "@/hooks/useOperationalDashboard";

interface DashboardNextActionsPanelProps {
  actions: NextAction[];
  isLoading: boolean;
}

const typeIcons: Record<NextAction["type"], React.ElementType> = {
  lead: Users,
  inbox: MessageSquare,
  opportunity: Target,
  task: CheckSquare,
};

const typeLabels: Record<NextAction["type"], string> = {
  lead: "Lead",
  inbox: "Inbox",
  opportunity: "Oportunidade",
  task: "Tarefa",
};

const priorityColors: Record<NextAction["priority"], string> = {
  high: "border-red-500 bg-red-50/50 dark:bg-red-950/20",
  medium: "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  low: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
};

function ActionItem({ action }: { action: NextAction }) {
  const navigate = useNavigate();
  const Icon = typeIcons[action.type];

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-sm group",
        priorityColors[action.priority]
      )}
      onClick={() => navigate(action.actionRoute)}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded bg-background/80">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {typeLabels[action.type]}
            </Badge>
          </div>
          <h4 className="font-medium text-sm">{action.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </div>
  );
}

export function DashboardNextActionsPanel({ actions, isLoading }: DashboardNextActionsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Próximas Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Próximas Ações</CardTitle>
        <CardDescription className="text-xs">
          O que merece a tua atenção agora
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Tudo em dia!</p>
            <p className="text-xs mt-1">Não há ações prioritárias agora.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.slice(0, 5).map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
