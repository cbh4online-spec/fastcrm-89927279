import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function SmartSendTimeCard() {
  const { currentWorkspace } = useWorkspace();

  const { data: hourlyData = [] } = useQuery({
    queryKey: ['smart-send-time', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      // Get open events from marketing_events
      const { data: events } = await supabase
        .from('marketing_events')
        .select('occurred_at')
        .eq('workspace_id', currentWorkspace.id)
        .eq('event_type', 'open')
        .order('occurred_at', { ascending: false })
        .limit(1000);

      // Also get click events
      const { data: clicks } = await supabase
        .from('campaign_link_clicks')
        .select('clicked_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('clicked_at', { ascending: false })
        .limit(1000);

      // Aggregate by hour
      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, opens: 0, clicks: 0 }));

      events?.forEach(e => {
        const h = new Date(e.occurred_at).getHours();
        hours[h].opens++;
      });

      clicks?.forEach(c => {
        const h = new Date(c.clicked_at).getHours();
        hours[h].clicks++;
      });

      return hours.map(h => ({
        hour: `${h.hour}h`,
        engagement: h.opens + h.clicks,
        opens: h.opens,
        clicks: h.clicks,
      }));
    },
    enabled: !!currentWorkspace?.id,
  });

  const hasData = hourlyData.some(h => h.engagement > 0);
  const bestHour = hasData
    ? hourlyData.reduce((best, curr) => curr.engagement > best.engagement ? curr : best, hourlyData[0])
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Melhor Horário de Envio
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Pico de engagement às <strong className="text-foreground">{bestHour?.hour}</strong> — 
              baseado em dados reais de aberturas e cliques
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={hourlyData} barSize={6}>
                <XAxis dataKey="hour" tick={{ fontSize: 8 }} interval={3} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value: number, name: string) => [value, name === 'opens' ? 'Aberturas' : 'Cliques']}
                />
                <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Envie campanhas para descobrir o melhor horário de envio
          </p>
        )}
      </CardContent>
    </Card>
  );
}
