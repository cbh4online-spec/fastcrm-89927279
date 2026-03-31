import { useEngagementSegments } from '@/hooks/useEngagementSegments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, Activity, EyeOff, Eye, AlertTriangle, ShieldAlert, UserMinus, Snowflake } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  zap: <Zap className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  'eye-off': <EyeOff className="h-4 w-4" />,
  eye: <Eye className="h-4 w-4" />,
  'alert-triangle': <AlertTriangle className="h-4 w-4" />,
  'shield-alert': <ShieldAlert className="h-4 w-4" />,
  'user-minus': <UserMinus className="h-4 w-4" />,
  snowflake: <Snowflake className="h-4 w-4" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export function EngagementSegmentsPanel() {
  const { data: segments = [], isLoading } = useEngagementSegments();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Segmentos Comportamentais
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">A calcular segmentos...</p>
        ) : segments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados suficientes para segmentação comportamental.
          </p>
        ) : (
          <div className="space-y-2">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <div className="text-muted-foreground">
                  {ICON_MAP[segment.icon] || <Users className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{segment.label}</span>
                    <Badge className={`text-xs ${SEVERITY_COLORS[segment.severity]}`}>
                      {segment.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{segment.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
