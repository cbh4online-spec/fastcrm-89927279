import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MousePointerClick } from 'lucide-react';

interface Props {
  campaignId: string;
  workspaceId: string;
}

export function ClickHeatmapPanel({ campaignId, workspaceId }: Props) {
  const { data: clicks, isLoading } = useQuery({
    queryKey: ['campaign-link-clicks', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_link_clicks')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('clicked_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });

  // Group by link URL
  const linkStats = (clicks || []).reduce((acc, c) => {
    const key = c.link_url;
    if (!acc[key]) {
      acc[key] = { url: key, count: 0, uniqueEmails: new Set<string>(), label: c.link_label };
    }
    acc[key].count++;
    if (c.recipient_email) acc[key].uniqueEmails.add(c.recipient_email);
    return acc;
  }, {} as Record<string, { url: string; count: number; uniqueEmails: Set<string>; label: string | null }>);

  const sortedLinks = Object.values(linkStats).sort((a, b) => b.count - a.count);
  const totalClicks = clicks?.length || 0;
  const totalUniqueClickers = new Set(clicks?.map(c => c.recipient_email).filter(Boolean)).size;

  const getClickColor = (count: number) => {
    if (count > 10) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (count >= 3) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (count >= 1) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-500 border-gray-200';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MousePointerClick className="h-4 w-4 text-primary" />
          Mapa de Cliques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total cliques:</span>{' '}
            <strong>{totalClicks}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Clicadores únicos:</span>{' '}
            <strong>{totalUniqueClickers}</strong>
          </div>
        </div>

        {/* Link ranking */}
        {sortedLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isLoading ? 'A carregar...' : 'Sem cliques registados'}
          </p>
        ) : (
          <div className="space-y-2">
            {sortedLinks.map((link, i) => (
              <div key={link.url} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                <span className="text-muted-foreground font-mono text-xs w-6 text-right">
                  #{i + 1}
                </span>
                <Badge className={`${getClickColor(link.count)} shrink-0`} variant="outline">
                  {link.count}
                </Badge>
                <div className="flex-1 min-w-0 truncate">
                  <p className="truncate text-xs font-mono">{link.url}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {link.uniqueEmails.size} únicos
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
