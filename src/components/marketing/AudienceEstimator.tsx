import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { useMarketingSegments } from '@/hooks/useMarketingSegments';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, MousePointer } from 'lucide-react';

interface AudienceEstimatorProps {
  segmentId?: string;
}

export function AudienceEstimator({ segmentId }: AudienceEstimatorProps) {
  const { data: campaigns = [] } = useMarketingCampaigns();
  const { data: segments = [] } = useMarketingSegments();

  const selectedSegment = segments.find(s => s.id === segmentId);
  const recipientCount = selectedSegment?.contactCount || 0;

  // Calculate historical averages from sent campaigns
  const sent = campaigns.filter(c => c.status === 'sent');
  const totalDelivered = sent.reduce((s, c) => s + c.deliveredCount, 0);
  const totalOpened = sent.reduce((s, c) => s + c.openedCount, 0);
  const totalClicked = sent.reduce((s, c) => s + c.clickedCount, 0);

  const avgOpenRate = totalDelivered > 0 ? totalOpened / totalDelivered : 0.22;
  const avgClickRate = totalDelivered > 0 ? totalClicked / totalDelivered : 0.03;

  const estimatedOpens = Math.round(recipientCount * avgOpenRate);
  const estimatedClicks = Math.round(recipientCount * avgClickRate);

  if (!segmentId || recipientCount === 0) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{recipientCount}</span>
            <span className="text-muted-foreground text-xs">destinatários</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="font-medium">~{estimatedOpens}</span>
            <span className="text-muted-foreground text-xs">
              aberturas ({(avgOpenRate * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MousePointer className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium">~{estimatedClicks}</span>
            <span className="text-muted-foreground text-xs">
              cliques ({(avgClickRate * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
        {sent.length === 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Estimativa baseada em médias do setor. Melhora após as primeiras campanhas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
