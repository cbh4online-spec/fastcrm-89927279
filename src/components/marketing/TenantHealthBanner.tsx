import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Ban
} from 'lucide-react';
import { 
  checkTenantHealth, 
  type HealthStatus, 
  type TenantHealthCheck 
} from '@/lib/marketingDeliverability';

interface TenantHealthBannerProps {
  totalSent: number;
  totalBounced: number;
  totalComplained: number;
  className?: string;
}

const statusConfig: Record<HealthStatus, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  healthy: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    label: 'Saudável',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'Atenção',
  },
  critical: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    label: 'Crítico',
  },
  blocked: {
    icon: <Ban className="h-4 w-4" />,
    color: 'text-red-700',
    bgColor: 'bg-red-100 dark:bg-red-950/50',
    label: 'Bloqueado',
  },
};

export function TenantHealthBanner({ 
  totalSent, 
  totalBounced, 
  totalComplained,
  className 
}: TenantHealthBannerProps) {
  const health = checkTenantHealth(totalSent, totalBounced, totalComplained);
  const config = statusConfig[health.status];
  
  // Don't show anything if we don't have enough data and status is healthy
  if (totalSent < 50 && health.status === 'healthy') {
    return null;
  }
  
  // Only show if there are issues or for transparency
  if (health.status === 'healthy' && health.alerts.length === 0) {
    return (
      <Card className={`${config.bgColor} border-0 ${className}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${config.color}`} />
              <span className="text-sm font-medium">Saúde do Domínio</span>
              <Badge variant="outline" className={`${config.color} border-current`}>
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Score: {health.healthScore.toFixed(0)}%</span>
              <span>Bounce: {health.bounceRate.toFixed(1)}%</span>
              <span>Complaints: {health.complaintRate.toFixed(2)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show alerts for warning/critical/blocked states
  return (
    <Alert className={`${config.bgColor} border-0 ${className}`}>
      <div className={config.color}>
        {config.icon}
      </div>
      <AlertTitle className="flex items-center gap-2">
        Saúde do Domínio
        <Badge variant="outline" className={`${config.color} border-current`}>
          {config.label}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {health.alerts.map((alert, index) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <TrendingDown className="h-3 w-3 shrink-0" />
              {alert}
            </p>
          ))}
          {!health.canSend && (
            <p className="text-sm font-medium mt-2">
              O envio de campanhas está temporariamente bloqueado. Limpa a tua lista de contactos para continuar.
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
          <span>Score: {health.healthScore.toFixed(0)}%</span>
          <span>Bounce Rate: {health.bounceRate.toFixed(1)}%</span>
          <span>Complaint Rate: {health.complaintRate.toFixed(2)}%</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
