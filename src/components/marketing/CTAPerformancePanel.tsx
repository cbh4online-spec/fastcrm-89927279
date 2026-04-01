import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MousePointer, Trophy, ExternalLink } from 'lucide-react';

export function CTAPerformancePanel() {
  const { currentWorkspace } = useWorkspace();

  const { data: ctaRanking = [] } = useQuery({
    queryKey: ['cta-performance', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data: clicks } = await supabase
        .from('campaign_link_clicks')
        .select('link_url, clicked_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('clicked_at', { ascending: false })
        .limit(5000);

      if (!clicks || clicks.length === 0) return [];

      // Group by URL pattern (remove query params for grouping)
      const grouped: Record<string, { url: string; clicks: number }> = {};
      clicks.forEach(c => {
        try {
          const url = new URL(c.link_url);
          const key = `${url.hostname}${url.pathname}`;
          if (!grouped[key]) grouped[key] = { url: c.link_url, clicks: 0 };
          grouped[key].clicks++;
        } catch {
          const key = c.link_url.substring(0, 60);
          if (!grouped[key]) grouped[key] = { url: c.link_url, clicks: 0 };
          grouped[key].clicks++;
        }
      });

      return Object.values(grouped)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);
    },
    enabled: !!currentWorkspace?.id,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MousePointer className="h-4 w-4 text-primary" />
          Performance de CTAs / Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ctaRanking.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sem dados de cliques.</p>
        ) : (
          <div className="space-y-2">
            {ctaRanking.map((cta, i) => {
              let displayUrl = cta.url;
              try {
                const u = new URL(cta.url);
                displayUrl = `${u.hostname}${u.pathname}`.substring(0, 40);
              } catch {}

              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                  <div className="w-6 text-center">
                    {i === 0 ? <Trophy className="h-4 w-4 text-amber-500 mx-auto" /> : (
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {displayUrl}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {cta.clicks} cliques
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
