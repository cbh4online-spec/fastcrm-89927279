import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Shield,
  TrendingDown,
  TrendingUp,
  Ban,
  MailWarning,
} from 'lucide-react';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';

interface AggregateMetrics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplained: number;
  totalUnsubscribed: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  deliveryRate: number;
  campaignCount: number;
}

function HealthBadge({ rate, thresholdWarn, thresholdDanger, label }: { 
  rate: number; thresholdWarn: number; thresholdDanger: number; label: string 
}) {
  if (rate >= thresholdDanger) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> {label}: {rate.toFixed(2)}%
      </Badge>
    );
  }
  if (rate >= thresholdWarn) {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 gap-1">
        <MailWarning className="h-3 w-3" /> {label}: {rate.toFixed(2)}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
      <CheckCircle className="h-3 w-3" /> {label}: {rate.toFixed(2)}%
    </Badge>
  );
}

export function DeliverabilityDashboard() {
  const { data: campaigns = [] } = useMarketingCampaigns();

  const metrics: AggregateMetrics = useMemo(() => {
    // Filter to campaigns sent in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCampaigns = campaigns.filter(c => 
      c.status === 'sent' && c.completedAt && new Date(c.completedAt) >= thirtyDaysAgo
    );

    const totalSent = recentCampaigns.reduce((sum, c) => sum + c.sentCount, 0);
    const totalDelivered = recentCampaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
    const totalBounced = recentCampaigns.reduce((sum, c) => sum + c.bouncedCount, 0);
    const totalComplained = recentCampaigns.reduce((sum, c) => sum + c.complainedCount, 0);
    const totalUnsubscribed = recentCampaigns.reduce((sum, c) => sum + c.unsubscribedCount, 0);

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalComplained,
      totalUnsubscribed,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
      unsubscribeRate: totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      campaignCount: recentCampaigns.length,
    };
  }, [campaigns]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Saúde da Base (últimos 30 dias)
        </h3>
        <p className="text-sm text-muted-foreground">{metrics.campaignCount} campanhas</p>
      </div>

      {/* Health badges */}
      <div className="flex flex-wrap gap-2">
        <HealthBadge rate={metrics.bounceRate} thresholdWarn={3} thresholdDanger={5} label="Bounce" />
        <HealthBadge rate={metrics.complaintRate} thresholdWarn={0.1} thresholdDanger={0.3} label="Complaint" />
        <HealthBadge rate={metrics.unsubscribeRate} thresholdWarn={0.5} thresholdDanger={1} label="Unsubscribe" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" /> Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.deliveryRate.toFixed(1)}%</div>
            <Progress value={metrics.deliveryRate} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" /> Bounces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBounced}</div>
            <p className="text-xs text-muted-foreground">{metrics.bounceRate.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Ban className="h-3 w-3 text-orange-500" /> Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalComplained}</div>
            <p className="text-xs text-muted-foreground">{metrics.complaintRate.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(metrics.bounceRate > 5 || metrics.complaintRate > 0.3) && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Alertas de Entregabilidade
            </p>
            {metrics.bounceRate > 5 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Taxa de bounce &gt; 5% — considere limpar a base de contactos inválidos
              </p>
            )}
            {metrics.complaintRate > 0.3 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Taxa de complaint &gt; 0.3% — revise a frequência e relevância dos envios
              </p>
            )}
            {metrics.unsubscribeRate > 1 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Taxa de unsubscribe elevada — considere campanhas de re-engagement ou segmentação mais fina
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
