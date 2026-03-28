import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, BarChart3, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { RevenueAttributionPanel } from './RevenueAttributionPanel';
import { ContactJourneyTimeline } from './ContactJourneyTimeline';

export function AdvancedAnalyticsPanel() {
  const { currentWorkspace } = useWorkspace();
  const { data: campaigns = [] } = useMarketingCampaigns();
  const [selectedCampaignA, setSelectedCampaignA] = useState<string>('');
  const [selectedCampaignB, setSelectedCampaignB] = useState<string>('');

  const sentCampaigns = campaigns.filter(c => c.status === 'sent');

  // Real engagement decay from marketing_events
  const { data: decayData = [] } = useQuery({
    queryKey: ['engagement-decay', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data: events } = await supabase
        .from('marketing_events')
        .select('event_type, occurred_at, campaign_id')
        .eq('workspace_id', currentWorkspace.id)
        .in('event_type', ['open', 'click'])
        .order('occurred_at', { ascending: true })
        .limit(1000);

      if (!events || events.length === 0) {
        return [
          { hour: '1h', opens: 0, clicks: 0 },
          { hour: '6h', opens: 0, clicks: 0 },
          { hour: '24h', opens: 0, clicks: 0 },
          { hour: '48h', opens: 0, clicks: 0 },
          { hour: '72h', opens: 0, clicks: 0 },
          { hour: '7d', opens: 0, clicks: 0 },
        ];
      }

      // Get campaign send times to calculate relative timing
      const campaignIds = [...new Set(events.map(e => e.campaign_id))];
      const campaignSendTimes = new Map<string, Date>();
      
      for (const c of campaigns) {
        if (c.startedAt && campaignIds.includes(c.id)) {
          campaignSendTimes.set(c.id, new Date(c.startedAt));
        }
      }

      const buckets = [
        { label: '1h', maxHours: 1, opens: 0, clicks: 0 },
        { label: '6h', maxHours: 6, opens: 0, clicks: 0 },
        { label: '24h', maxHours: 24, opens: 0, clicks: 0 },
        { label: '48h', maxHours: 48, opens: 0, clicks: 0 },
        { label: '72h', maxHours: 72, opens: 0, clicks: 0 },
        { label: '7d', maxHours: 168, opens: 0, clicks: 0 },
      ];

      events.forEach(evt => {
        const sendTime = campaignSendTimes.get(evt.campaign_id);
        if (!sendTime) return;
        const hoursAfter = (new Date(evt.occurred_at).getTime() - sendTime.getTime()) / (1000 * 60 * 60);
        
        for (const bucket of buckets) {
          if (hoursAfter <= bucket.maxHours) {
            if (evt.event_type === 'open') bucket.opens++;
            else bucket.clicks++;
            break;
          }
        }
      });

      // Convert to percentages
      const maxOpens = Math.max(...buckets.map(b => b.opens), 1);
      return buckets.map(b => ({
        hour: b.label,
        opens: Math.round((b.opens / maxOpens) * 100),
        clicks: Math.round((b.clicks / maxOpens) * 100),
      }));
    },
    enabled: !!currentWorkspace?.id,
  });

  // Real best time data
  const { data: bestTimeData = [] } = useQuery({
    queryKey: ['best-send-time-analytics', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data: events } = await supabase
        .from('marketing_events')
        .select('occurred_at')
        .eq('workspace_id', currentWorkspace.id)
        .eq('event_type', 'open')
        .order('occurred_at', { ascending: false })
        .limit(1000);

      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, opens: 0 }));
      
      events?.forEach(e => {
        const h = new Date(e.occurred_at).getHours();
        hours[h].opens++;
      });

      return hours;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Campaign comparison
  const campaignA = sentCampaigns.find(c => c.id === selectedCampaignA);
  const campaignB = sentCampaigns.find(c => c.id === selectedCampaignB);

  const comparisonData = campaignA && campaignB ? [
    { metric: 'Enviados', a: campaignA.sentCount, b: campaignB.sentCount },
    { metric: 'Entregues', a: campaignA.deliveredCount, b: campaignB.deliveredCount },
    { metric: 'Abertos', a: campaignA.openedCount, b: campaignB.openedCount },
    { metric: 'Clicados', a: campaignA.clickedCount, b: campaignB.clickedCount },
  ] : [];

  // Engagement distribution pie
  const totalSent = sentCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpened = sentCampaigns.reduce((s, c) => s + c.openedCount, 0);
  const totalClicked = sentCampaigns.reduce((s, c) => s + c.clickedCount, 0);
  const totalBounced = sentCampaigns.reduce((s, c) => s + c.bouncedCount, 0);
  const noAction = totalSent - totalOpened - totalBounced;

  const pieData = [
    { name: 'Abriram', value: totalOpened - totalClicked, color: 'hsl(var(--primary))' },
    { name: 'Clicaram', value: totalClicked, color: 'hsl(142, 76%, 36%)' },
    { name: 'Sem acção', value: Math.max(0, noAction), color: 'hsl(var(--muted-foreground))' },
    { name: 'Bounced', value: totalBounced, color: 'hsl(0, 84%, 60%)' },
  ].filter(d => d.value > 0);

  const handleExportPdf = () => {
    const csvRows = [
      'Campanha,Enviados,Entregues,Abertos,Clicados,Bounced',
      ...sentCampaigns.map(c =>
        `"${c.name}",${c.sentCount},${c.deliveredCount},${c.openedCount},${c.clickedCount},${c.bouncedCount}`
      ),
    ].join('\n');
    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytics Avançados
        </h2>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Tabs defaultValue="decay" className="space-y-4">
        <TabsList>
          <TabsTrigger value="decay">Engagement Decay</TabsTrigger>
          <TabsTrigger value="besttime">Melhor Horário</TabsTrigger>
          <TabsTrigger value="compare">Comparar</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="journey">Jornada</TabsTrigger>
        </TabsList>

        <TabsContent value="decay">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Decaimento de Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Como as aberturas e cliques diminuem ao longo do tempo após o envio
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={decayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opens" name="Aberturas %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="clicks" name="Cliques %" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="besttime">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Melhor Hora de Envio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Aberturas por hora do dia (dados reais das suas campanhas)
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bestTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="opens" name="Aberturas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparar Campanhas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Campanha A</p>
                  <Select value={selectedCampaignA} onValueChange={setSelectedCampaignA}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {sentCampaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Campanha B</p>
                  <Select value={selectedCampaignB} onValueChange={setSelectedCampaignB}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {sentCampaigns.filter(c => c.id !== selectedCampaignA).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {comparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="a" name={campaignA?.name || 'A'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="b" name={campaignB?.name || 'B'} fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Seleciona duas campanhas para comparar
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo Global</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total campanhas enviadas</span>
                  <strong>{sentCampaigns.length}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total emails enviados</span>
                  <strong>{totalSent.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa média de abertura</span>
                  <strong>{totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0}%</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa média de cliques</span>
                  <strong>{totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0}%</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa média de bounce</span>
                  <strong>{totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : 0}%</strong>
                </div>
                {sentCampaigns.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Melhor campanha por abertura:</p>
                    <p className="text-sm font-medium">
                      {sentCampaigns.sort((a, b) =>
                        (b.deliveredCount > 0 ? b.openedCount / b.deliveredCount : 0) -
                        (a.deliveredCount > 0 ? a.openedCount / a.deliveredCount : 0)
                      )[0]?.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAttributionPanel />
        </TabsContent>

        <TabsContent value="journey">
          <ContactJourneyTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
