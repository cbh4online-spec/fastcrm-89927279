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

  if (!activities || activities.length === 0) {
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
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Sem atividades recentes</p>
            <p className="text-xs text-muted-foreground/70 mt-1">As atividades aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        {activities.slice(0, maxItems).map((activity: any) => {
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
