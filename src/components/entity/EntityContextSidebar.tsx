import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Flame,
  ThermometerSun,
  Snowflake,
  User,
  Clock,
  Mail,
  Phone,
  Target,
  MessageSquare,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { EntityType, Entity } from '@/types/entity';
import { cn } from '@/lib/utils';

interface EntityContextSidebarProps {
  entityType: EntityType;
  entity: Entity;
  assignedUser?: {
    name: string;
    email: string;
  };
  bestChannel?: string;
  bestTime?: string;
  lastActivityAt?: Date;
}

const TEMPERATURE_CONFIG = {
  hot: { icon: Flame, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Quente' },
  warm: { icon: ThermometerSun, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Morno' },
  cold: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Frio' },
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'agora mesmo';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias`;
  
  return date.toLocaleDateString('pt-PT');
}

interface StatRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}

function StatRow({ icon: Icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export function EntityContextSidebar({
  entityType,
  entity,
  assignedUser,
  bestChannel = 'Email',
  bestTime = '10h - 12h',
  lastActivityAt,
}: EntityContextSidebarProps) {
  const temperature = entity.ai_temperature as keyof typeof TEMPERATURE_CONFIG | undefined;
  const tempConfig = temperature ? TEMPERATURE_CONFIG[temperature] : null;
  const TempIcon = tempConfig?.icon;

  const score = entity.lead_score || entity.contact_score || entity.company_score || 0;
  const conversionProb = entity.conversion_probability || 0;
  const estimatedValue = entity.estimated_value || 0;

  const statusLabels: Record<string, string> = {
    new: 'Novo',
    in_progress: 'Em Progresso',
    completed: 'Concluído',
  };

  const status = (entity as any).status;

  return (
    <div className="w-72 border-l bg-muted/30 flex-shrink-0 overflow-auto">
      <div className="p-4 space-y-4">
        {/* Status & Temperature Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado Atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status Badge */}
            {status && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant="outline">{statusLabels[status] || status}</Badge>
              </div>
            )}

            {/* Temperature */}
            {tempConfig && TempIcon && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Temperatura</span>
                <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', tempConfig.bg)}>
                  <TempIcon className={cn('h-3 w-3', tempConfig.color)} />
                  <span className={tempConfig.color}>{tempConfig.label}</span>
                </div>
              </div>
            )}

            {/* Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8">{score}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Métricas</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <StatRow 
              icon={TrendingUp} 
              label="Probabilidade" 
              value={`${conversionProb}%`} 
            />
            <StatRow 
              icon={Target} 
              label="Valor Estimado" 
              value={estimatedValue > 0 ? `€${estimatedValue.toLocaleString()}` : '—'} 
            />
            <StatRow 
              icon={MessageSquare} 
              label="Melhor Canal" 
              value={bestChannel} 
            />
            <StatRow 
              icon={Clock} 
              label="Melhor Hora" 
              value={bestTime} 
            />
          </CardContent>
        </Card>

        {/* Assigned User */}
        {assignedUser && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {assignedUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{assignedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{assignedUser.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {lastActivityAt 
                  ? `Há ${getTimeAgo(lastActivityAt)}`
                  : entity.updated_at 
                    ? `Há ${getTimeAgo(new Date(entity.updated_at))}`
                    : 'Sem atividade'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contacto Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entity.email ? (
              <a 
                href={`mailto:${entity.email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {entity.email}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Sem email
              </p>
            )}
            {entity.phone ? (
              <a 
                href={`tel:${entity.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {entity.phone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Sem telefone
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
