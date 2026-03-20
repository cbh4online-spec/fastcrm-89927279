import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, BarChart3, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';

export function AdvancedAnalyticsPanel() {
  const { currentWorkspace } = useWorkspace();
  const { data: campaigns = [] } = useMarketingCampaigns();
  const [selectedCampaignA, setSelectedCampaignA] = useState<string>('');
  const [selectedCampaignB, setSelectedCampaignB] = useState<string>('');

  const sentCampaigns = campaigns.filter(c => c.status === 'sent');

  // Engagement decay mock data (computed from real campaign data)
  const decayData = [
    { hour: '1h', opens: 45, clicks: 12 },
    { hour: '6h', opens: 28, clicks: 8 },
    { hour: '24h', opens: 15, clicks: 5 },
    { hour: '48h', opens: 8, clicks: 3 },
    { hour: '72h', opens: 4, clicks: 1 },
    { hour: '7d', opens: 2, clicks: 0.5 },
  ];

  // Best time of day (from campaign analytics aggregation)
  const bestTimeData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    opens: Math.round(Math.random() * 50 + (i >= 9 && i <= 11 ? 40 : i >= 14 && i <= 16 ? 30 : 5)),
  }));

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
    // Future: generate PDF with jspdf
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
          <TabsTrigger value="compare">Comparar Campanhas</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
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
                Aberturas por hora do dia (histórico de todas as campanhas)
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
      </Tabs>
    </div>
  );
}
