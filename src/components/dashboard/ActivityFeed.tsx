import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/hooks/useActivities";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  Target,
  CheckCircle,
  Calendar,
  TrendingUp
} from "lucide-react";

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  message: MessageSquare,
  proposal: FileText,
  lead: Target,
  task: CheckCircle,
  meeting: Calendar,
  opportunity: TrendingUp,
};

const activityColors: Record<string, string> = {
  call: "bg-blue-500/10 text-blue-600",
  email: "bg-purple-500/10 text-purple-600",
  message: "bg-emerald-500/10 text-emerald-600",
  proposal: "bg-amber-500/10 text-amber-600",
  lead: "bg-cyan-500/10 text-cyan-600",
  task: "bg-green-500/10 text-green-600",
  meeting: "bg-pink-500/10 text-pink-600",
  opportunity: "bg-orange-500/10 text-orange-600",
};

interface ActivityFeedProps {
  maxItems?: number;
  isLoading?: boolean;
}

export function ActivityFeed({ maxItems = 6, isLoading = false }: ActivityFeedProps) {
  const { data: activities, isLoading: activitiesLoading } = useActivities({ limit: maxItems });

  const loading = isLoading || activitiesLoading;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Demo activities if no real data
  const demoActivities = [
    { id: "1", activity_type: "call", title: "Chamada com João Silva", created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), performed_by: "Maria Costa" },
    { id: "2", activity_type: "email", title: "Email enviado para TechCorp", created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), performed_by: "Pedro Santos" },
    { id: "3", activity_type: "proposal", title: "Proposta criada - €15.000", created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), performed_by: "Ana Ferreira" },
    { id: "4", activity_type: "lead", title: "Novo lead qualificado", created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), performed_by: "Carlos Mendes" },
    { id: "5", activity_type: "meeting", title: "Reunião agendada", created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), performed_by: "Sofia Lima" },
    { id: "6", activity_type: "opportunity", title: "Oportunidade fechada - €8.500", created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(), performed_by: "Rui Oliveira" },
  ];

  const displayActivities = activities && activities.length > 0 ? activities : demoActivities;

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
          <Badge variant="secondary" className="text-xs">
            Hoje
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayActivities.slice(0, maxItems).map((activity: any) => {
          const activityType = activity.activity_type || "task";
          const Icon = activityIcons[activityType] || CheckCircle;
          const colorClass = activityColors[activityType] || "bg-muted text-muted-foreground";
          const performedBy = activity.performed_by || "Sistema";
          const initials = typeof performedBy === 'string' 
            ? performedBy.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : "SY";

          return (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`p-1 rounded ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { 
                      addSuffix: true, 
                      locale: pt 
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
