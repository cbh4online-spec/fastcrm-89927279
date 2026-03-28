import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { ShieldCheck } from 'lucide-react';

function getScoreColor(score: number) {
  if (score >= 75) return { bg: 'bg-green-500', text: 'text-green-700', label: 'Excelente', ring: 'ring-green-500/20' };
  if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', label: 'Atenção', ring: 'ring-amber-500/20' };
  return { bg: 'bg-red-500', text: 'text-red-700', label: 'Crítico', ring: 'ring-red-500/20' };
}

export function HealthScoreCard() {
  const { data: campaigns = [] } = useMarketingCampaigns();
  const sent = campaigns.filter(c => c.status === 'sent');

  const totalSent = sent.reduce((s, c) => s + c.sentCount, 0);
  const totalDelivered = sent.reduce((s, c) => s + c.deliveredCount, 0);
  const totalOpened = sent.reduce((s, c) => s + c.openedCount, 0);
  const totalBounced = sent.reduce((s, c) => s + c.bouncedCount, 0);
  const totalComplained = sent.reduce((s, c) => s + c.complainedCount, 0);

  // Score calculation (0-100)
  const deliverability = totalSent > 0 ? (totalDelivered / totalSent) : 1;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) : 0;
  const complaintRate = totalSent > 0 ? (totalComplained / totalSent) : 0;
  const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) : 0;

  const delivScore = Math.min(deliverability * 100, 100) * 0.35;
  const bounceScore = Math.max(0, (1 - bounceRate * 20)) * 100 * 0.25; // 5% bounce = 0
  const complaintScore = Math.max(0, (1 - complaintRate * 100)) * 100 * 0.2; // 1% complaint = 0
  const engagementScore = Math.min(openRate * 5, 1) * 100 * 0.2; // 20% open = max

  const score = Math.round(Math.max(0, Math.min(100, delivScore + bounceScore + complaintScore + engagementScore)));
  const style = getScoreColor(score);

  const factors = [
    { label: 'Entregabilidade', value: `${(deliverability * 100).toFixed(1)}%` },
    { label: 'Bounce', value: `${(bounceRate * 100).toFixed(1)}%` },
    { label: 'Reclamações', value: `${(complaintRate * 100).toFixed(2)}%` },
    { label: 'Engagement', value: `${(openRate * 100).toFixed(1)}%` },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`relative flex items-center justify-center w-16 h-16 rounded-full ring-4 ${style.ring}`}>
            <div className={`w-12 h-12 rounded-full ${style.bg} flex items-center justify-center`}>
              <span className="text-lg font-bold text-white">{totalSent > 0 ? score : '—'}</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {totalSent > 0 ? (
              <>
                <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {factors.map(f => (
                    <div key={f.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-medium">{f.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Envie a primeira campanha para ver o score</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
