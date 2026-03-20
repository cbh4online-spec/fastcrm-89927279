import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Mail, MousePointerClick, UserX, AlertTriangle, Download } from 'lucide-react';
import { useState } from 'react';

interface Props {
  campaignId: string;
  workspaceId: string;
}

export function ActivityFeed({ campaignId, workspaceId }: Props) {
  const [filter, setFilter] = useState('all');

  const { data: events, isLoading } = useQuery({
    queryKey: ['campaign-activity-feed', campaignId, filter],
    queryFn: async () => {
      let query = supabase
        .from('marketing_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('occurred_at', { ascending: false })
        .limit(200);

      if (filter !== 'all') {
        query = query.eq('event_type', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });

  const EVENT_ICONS: Record<string, any> = {
    opened: Mail,
    clicked: MousePointerClick,
    bounced: AlertTriangle,
    unsubscribed: UserX,
  };

  const EVENT_LABELS: Record<string, string> = {
    opened: 'Abriu',
    clicked: 'Clicou',
    bounced: 'Bounce',
    unsubscribed: 'Cancelou',
    delivered: 'Entregue',
    complained: 'Spam',
  };

  const EVENT_COLORS: Record<string, string> = {
    opened: 'text-blue-500',
    clicked: 'text-emerald-500',
    bounced: 'text-red-500',
    unsubscribed: 'text-amber-500',
    delivered: 'text-gray-500',
    complained: 'text-red-600',
  };

  const handleExport = () => {
    if (!events) return;
    const csv = ['Hora,Email,Ação,Link\n', ...events.map(e =>
      `${new Date(e.occurred_at).toLocaleString('pt-PT')},${e.email || ''},${EVENT_LABELS[e.event_type] || e.event_type},${e.link_url || ''}\n`
    )].join('');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-${campaignId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Actividade
          </CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="opened">Aberturas</SelectItem>
                <SelectItem value="clicked">Cliques</SelectItem>
                <SelectItem value="bounced">Bounces</SelectItem>
                <SelectItem value="unsubscribed">Cancelamentos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Hora</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(events || []).map((e) => {
                const Icon = EVENT_ICONS[e.event_type] || Activity;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(e.occurred_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.email || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 ${EVENT_COLORS[e.event_type] || ''}`} />
                        <span className="text-xs">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-48">
                      {e.link_url || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!events || events.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'A carregar...' : 'Sem actividade'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
