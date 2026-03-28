import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronRight, X, TrendingDown, UserX, Clock, RefreshCw } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface Advice {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  onAction?: () => void;
}

interface CampaignAdvisorBannerProps {
  onCreateCampaign?: () => void;
}

export function CampaignAdvisorBanner({ onCreateCampaign }: CampaignAdvisorBannerProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: campaigns = [] } = useMarketingCampaigns();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Get inactive contacts count
  const { data: inactiveCount = 0 } = useQuery({
    queryKey: ['marketing-inactive-contacts', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .lt('updated_at', ninetyDaysAgo.toISOString());

      return count || 0;
    },
    enabled: !!currentWorkspace?.id,
  });

  const sentCampaigns = campaigns.filter(c => c.status === 'sent');
  const advices: Advice[] = [];

  // Analyze open rate trend
  if (sentCampaigns.length >= 2) {
    const recent = sentCampaigns.slice(0, 3);
    const older = sentCampaigns.slice(3, 6);

    const recentAvgOpen = recent.reduce((s, c) => s + (c.deliveredCount > 0 ? c.openedCount / c.deliveredCount : 0), 0) / recent.length;
    const olderAvgOpen = older.length > 0
      ? older.reduce((s, c) => s + (c.deliveredCount > 0 ? c.openedCount / c.deliveredCount : 0), 0) / older.length
      : recentAvgOpen;

    if (olderAvgOpen > 0 && recentAvgOpen < olderAvgOpen * 0.85) {
      const drop = ((olderAvgOpen - recentAvgOpen) / olderAvgOpen * 100).toFixed(0);
      advices.push({
        id: 'open-rate-drop',
        icon: <TrendingDown className="h-5 w-5 text-amber-500" />,
        title: `Taxa de abertura caiu ${drop}%`,
        description: 'Experimente alterar o horário de envio ou testar novos assuntos com A/B testing.',
        action: 'Ver Analytics',
        priority: 'high',
      });
    }
  }

  // Inactive contacts
  if (inactiveCount > 10) {
    advices.push({
      id: 'inactive-contacts',
      icon: <UserX className="h-5 w-5 text-orange-500" />,
      title: `${inactiveCount} contactos inativos`,
      description: `Tem ${inactiveCount} contactos sem atividade há mais de 90 dias. Lance uma campanha de re-engagement.`,
      action: 'Criar Campanha',
      priority: 'high',
      onAction: onCreateCampaign,
    });
  }

  // No campaigns recently
  if (sentCampaigns.length > 0) {
    const lastSent = new Date(sentCampaigns[0].createdAt);
    const daysSince = differenceInDays(new Date(), lastSent);
    if (daysSince > 14) {
      advices.push({
        id: 'no-recent-campaign',
        icon: <Clock className="h-5 w-5 text-blue-500" />,
        title: `${daysSince} dias sem campanha`,
        description: 'Manter uma cadência regular melhora o engagement. Envie algo esta semana.',
        action: 'Nova Campanha',
        priority: 'medium',
        onAction: onCreateCampaign,
      });
    }
  }

  // High bounce rate
  const totalSent = sentCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalBounced = sentCampaigns.reduce((s, c) => s + c.bouncedCount, 0);
  if (totalSent > 50 && totalBounced / totalSent > 0.05) {
    advices.push({
      id: 'high-bounce',
      icon: <RefreshCw className="h-5 w-5 text-red-500" />,
      title: 'Taxa de bounce elevada',
      description: `${(totalBounced / totalSent * 100).toFixed(1)}% dos seus emails retornaram. Limpe a sua lista de contactos.`,
      action: 'Ver Supressões',
      priority: 'high',
    });
  }

  // No campaigns at all
  if (campaigns.length === 0) {
    advices.push({
      id: 'first-campaign',
      icon: <Sparkles className="h-5 w-5 text-primary" />,
      title: 'Lance a sua primeira campanha',
      description: 'O email marketing é o canal com maior ROI. Comece com uma newsletter simples.',
      action: 'Começar',
      priority: 'medium',
      onAction: onCreateCampaign,
    });
  }

  const visibleAdvices = advices
    .filter(a => !dismissed.includes(a.id))
    .sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    })
    .slice(0, 2);

  if (visibleAdvices.length === 0) return null;

  return (
    <div className="space-y-3">
      {visibleAdvices.map((advice) => (
        <Card key={advice.id} className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="shrink-0">{advice.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{advice.title}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{advice.description}</p>
            </div>
            <Button
              size="sm"
              variant="default"
              className="shrink-0 gap-1"
              onClick={advice.onAction}
            >
              {advice.action}
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setDismissed(prev => [...prev, advice.id])}
            >
              <X className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
