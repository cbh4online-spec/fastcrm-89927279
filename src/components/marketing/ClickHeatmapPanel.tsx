import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MousePointerClick, List, Eye, Download } from 'lucide-react';

interface Props {
  campaignId: string;
  workspaceId: string;
  htmlContent?: string;
}

interface LinkStat {
  url: string;
  count: number;
  uniqueEmails: Set<string>;
  label: string | null;
  linkIndex: number | null;
}

export function ClickHeatmapPanel({ campaignId, workspaceId, htmlContent }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [view, setView] = useState<'visual' | 'list'>('list');

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

  // Fetch campaign HTML if not provided
  const { data: campaignData } = useQuery({
    queryKey: ['campaign-html', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns' as any)
        .select('body_html')
        .eq('id', campaignId)
        .single();
      if (error) return '';
      return (data as any)?.body_html || '';
    },
    enabled: !!campaignId && !htmlContent,
  });

  const emailHtml = htmlContent || campaignData || '';

  // Group by link URL
  const linkStats = (clicks || []).reduce((acc, c) => {
    const key = c.link_url;
    if (!acc[key]) {
      acc[key] = { url: key, count: 0, uniqueEmails: new Set<string>(), label: c.link_label, linkIndex: c.link_index };
    }
    acc[key].count++;
    if (c.recipient_email) acc[key].uniqueEmails.add(c.recipient_email);
    return acc;
  }, {} as Record<string, LinkStat>);

  const sortedLinks = Object.values(linkStats).sort((a, b) => b.count - a.count);
  const totalClicks = clicks?.length || 0;
  const totalUniqueClickers = new Set(clicks?.map(c => c.recipient_email).filter(Boolean)).size;
  const maxClicks = sortedLinks.length > 0 ? sortedLinks[0].count : 1;

  const getClickColor = (count: number) => {
    if (count > 10) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (count >= 3) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (count >= 1) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getHeatColor = (count: number) => {
    const ratio = count / maxClicks;
    if (ratio > 0.6) return 'rgba(16, 185, 129, 0.5)';
    if (ratio > 0.3) return 'rgba(245, 158, 11, 0.5)';
    if (ratio > 0) return 'rgba(239, 68, 68, 0.4)';
    return 'rgba(156, 163, 175, 0.2)';
  };

  // Inject heatmap overlay into iframe
  useEffect(() => {
    if (view !== 'visual' || !emailHtml || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Build link click map by URL
    const clickMap = new Map(sortedLinks.map(l => [l.url, l]));

    // Inject HTML with overlay styles
    const overlayScript = `
      <style>
        a { position: relative !important; }
        .heatmap-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          z-index: 100;
          pointer-events: none;
          font-family: system-ui, sans-serif;
          line-height: 1;
        }
      </style>
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${overlayScript}</head>
      <body style="margin:0;padding:0;">${emailHtml}</body>
      </html>
    `);
    doc.close();

    // After render, add badges to links
    setTimeout(() => {
      const links = doc.querySelectorAll('a[href]');
      links.forEach((link) => {
        const href = link.getAttribute('href') || '';
        // Try to find in click map (check both raw and decoded)
        let stat: LinkStat | undefined;
        for (const [url, s] of clickMap.entries()) {
          if (href.includes(url) || url.includes(href)) {
            stat = s;
            break;
          }
        }

        if (stat && stat.count > 0) {
          const el = link as HTMLElement;
          el.style.position = 'relative';
          el.style.outline = `3px solid ${getHeatColor(stat.count)}`;
          el.style.outlineOffset = '2px';
          el.style.borderRadius = '3px';

          const badge = doc.createElement('span');
          badge.className = 'heatmap-badge';
          badge.style.backgroundColor = stat.count > 10 ? '#10b981' : stat.count >= 3 ? '#f59e0b' : '#ef4444';
          badge.textContent = String(stat.count);
          el.appendChild(badge);
        }
      });

      // Resize iframe to content
      const body = doc.body;
      if (body) {
        iframe.style.height = `${body.scrollHeight + 40}px`;
      }
    }, 200);
  }, [view, emailHtml, sortedLinks]);

  const handleExport = () => {
    const csv = [
      'Posição,URL,Cliques,Únicos\n',
      ...sortedLinks.map((l, i) =>
        `${i + 1},"${l.url}",${l.count},${l.uniqueEmails.size}\n`
      ),
    ].join('');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clicks-${campaignId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary" />
            Mapa de Cliques
          </CardTitle>
          <div className="flex gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as 'visual' | 'list')}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="h-6 text-xs px-2 gap-1">
                  <List className="h-3 w-3" /> Lista
                </TabsTrigger>
                {emailHtml && (
                  <TabsTrigger value="visual" className="h-6 text-xs px-2 gap-1">
                    <Eye className="h-3 w-3" /> Visual
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
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
          {totalClicks > 0 && totalUniqueClickers > 0 && (
            <div>
              <span className="text-muted-foreground">Média por clicador:</span>{' '}
              <strong>{(totalClicks / totalUniqueClickers).toFixed(1)}</strong>
            </div>
          )}
        </div>

        {/* Visual Heatmap */}
        {view === 'visual' && emailHtml && (
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              className="w-full border-0"
              style={{ minHeight: 400 }}
              sandbox="allow-same-origin"
              title="Heatmap de cliques"
            />
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {sortedLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isLoading ? 'A carregar...' : 'Sem cliques registados'}
              </p>
            ) : (
              <div className="space-y-2">
                {sortedLinks.map((link, i) => {
                  const pct = totalClicks > 0 ? ((link.count / totalClicks) * 100).toFixed(1) : '0';
                  return (
                    <div key={link.url} className="flex items-center gap-3 p-2.5 rounded-lg border text-sm">
                      <span className="text-muted-foreground font-mono text-xs w-6 text-right shrink-0">
                        #{i + 1}
                      </span>
                      <Badge className={`${getClickColor(link.count)} shrink-0`} variant="outline">
                        {link.count}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-mono">{link.url}</p>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: link.count > 10 ? 'hsl(142, 76%, 36%)' : link.count >= 3 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-medium">{pct}%</span>
                        <p className="text-[10px] text-muted-foreground">{link.uniqueEmails.size} únicos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
