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
  Activity,
} from 'lucide-react';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

interface AggregateMetrics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplained: number;
  totalUnsubscribed: number;
  totalOpened: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  deliveryRate: number;
  campaignCount: number;
  deliverabilityScore: number;
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

function calculateScore(metrics: AggregateMetrics): number {
  let score = 100;
  // Bounce rate penalty
  if (metrics.bounceRate > 5) score -= 30;
  else if (metrics.bounceRate > 3) score -= 15;
  else if (metrics.bounceRate > 1) score -= 5;
  // Complaint rate penalty
  if (metrics.complaintRate > 0.3) score -= 25;
  else if (metrics.complaintRate > 0.1) score -= 10;
  // Unsubscribe penalty
  if (metrics.unsubscribeRate > 1) score -= 15;
  else if (metrics.unsubscribeRate > 0.5) score -= 5;
  // Delivery rate bonus
  if (metrics.deliveryRate >= 98) score = Math.min(score + 5, 100);
  return Math.max(0, score);
}

export function DeliverabilityDashboard() {
  const { data: campaigns = [] } = useMarketingCampaigns();

  const sentCampaigns = useMemo(() => 
    campaigns.filter(c => c.status === 'sent' && c.completedAt),
  [campaigns]);

  const metrics: AggregateMetrics = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCampaigns = sentCampaigns.filter(c => 
      new Date(c.completedAt!) >= thirtyDaysAgo
    );

    const totalSent = recentCampaigns.reduce((sum, c) => sum + c.sentCount, 0);
    const totalDelivered = recentCampaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
    const totalBounced = recentCampaigns.reduce((sum, c) => sum + c.bouncedCount, 0);
    const totalComplained = recentCampaigns.reduce((sum, c) => sum + c.complainedCount, 0);
    const totalUnsubscribed = recentCampaigns.reduce((sum, c) => sum + c.unsubscribedCount, 0);
    const totalOpened = recentCampaigns.reduce((sum, c) => sum + c.openedCount, 0);

    const base = {
      totalSent,
      totalDelivered,
      totalBounced,
      totalComplained,
      totalUnsubscribed,
      totalOpened,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
      unsubscribeRate: totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      campaignCount: recentCampaigns.length,
      deliverabilityScore: 0,
    };
    base.deliverabilityScore = calculateScore(base);
    return base;
  }, [sentCampaigns]);

  // Monthly trend data (last 6 months)
  const trendData = useMemo(() => {
    const months: Array<{ month: string; bounceRate: number; complaintRate: number; unsubRate: number }> = [];
    
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const monthCampaigns = sentCampaigns.filter(c => {
        const d = new Date(c.completedAt!);
        return d >= start && d < end;
      });

      const sent = monthCampaigns.reduce((s, c) => s + c.sentCount, 0);
      const delivered = monthCampaigns.reduce((s, c) => s + c.deliveredCount, 0);

      months.push({
        month: start.toLocaleDateString('pt-PT', { month: 'short' }),
        bounceRate: sent > 0 ? (monthCampaigns.reduce((s, c) => s + c.bouncedCount, 0) / sent) * 100 : 0,
        complaintRate: sent > 0 ? (monthCampaigns.reduce((s, c) => s + c.complainedCount, 0) / sent) * 100 : 0,
        unsubRate: delivered > 0 ? (monthCampaigns.reduce((s, c) => s + c.unsubscribedCount, 0) / delivered) * 100 : 0,
      });
    }
    return months;
  }, [sentCampaigns]);

  // Engagement decay
  const engagementDecay = useMemo(() => {
    if (metrics.totalDelivered === 0) return { active: 0, passive: 0, inactive: 0 };
    const openRate = metrics.totalOpened / metrics.totalDelivered;
    return {
      active: Math.round(openRate * 100),
      passive: Math.round((1 - openRate) * 0.6 * 100),
      inactive: Math.round((1 - openRate) * 0.4 * 100),
    };
  }, [metrics]);

  const scoreColor = metrics.deliverabilityScore >= 80 
    ? 'text-green-600' 
    : metrics.deliverabilityScore >= 60 
    ? 'text-amber-600' 
    : 'text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Saúde da Base (últimos 30 dias)
        </h3>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {metrics.deliverabilityScore}/100
          </div>
          <p className="text-sm text-muted-foreground">{metrics.campaignCount} campanhas</p>
        </div>
      </div>

      {/* Health badges */}
      <div className="flex flex-wrap gap-2">
        <HealthBadge rate={metrics.bounceRate} thresholdWarn={3} thresholdDanger={5} label="Bounce" />
        <HealthBadge rate={metrics.complaintRate} thresholdWarn={0.1} thresholdDanger={0.3} label="Complaint" />
        <HealthBadge rate={metrics.unsubscribeRate} thresholdWarn={0.5} thresholdDanger={1} label="Unsubscribe" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 text-blue-500" /> Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-green-600">Ativo</span>
                <span className="font-medium">{engagementDecay.active}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600">Passivo</span>
                <span className="font-medium">{engagementDecay.passive}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inativo</span>
                <span className="font-medium">{engagementDecay.inactive}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      {trendData.some(t => t.bounceRate > 0 || t.complaintRate > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tendência Mensal (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => [
                  `${v.toFixed(2)}%`,
                  name === 'bounceRate' ? 'Bounce' : name === 'complaintRate' ? 'Complaint' : 'Unsub',
                ]} />
                <Bar dataKey="bounceRate" fill="hsl(0, 72%, 51%)" name="bounceRate" radius={[2, 2, 0, 0]} />
                <Bar dataKey="complaintRate" fill="hsl(25, 95%, 53%)" name="complaintRate" radius={[2, 2, 0, 0]} />
                <Bar dataKey="unsubRate" fill="hsl(45, 93%, 47%)" name="unsubRate" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {(metrics.bounceRate > 5 || metrics.complaintRate > 0.3) && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Alertas de Entregabilidade
            </p>
            {metrics.bounceRate > 5 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Taxa de bounce &gt; 5% — limpe contactos inválidos e valide a lista antes do próximo envio
              </p>
            )}
            {metrics.complaintRate > 0.3 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Taxa de complaint &gt; 0.3% — revise a frequência, segmentação e relevância dos envios
              </p>
            )}
            {metrics.unsubscribeRate > 1 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Taxa de unsubscribe elevada — considere re-engagement segmentado ou redução de frequência
              </p>
            )}
            {engagementDecay.inactive > 30 && (
              <p className="text-sm text-muted-foreground">
                ⚠️ {engagementDecay.inactive}% da base inativa — considere campanha de re-engagement ou limpeza
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
