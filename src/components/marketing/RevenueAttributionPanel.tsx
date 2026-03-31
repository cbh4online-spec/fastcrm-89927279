import { useAllCampaignAttributions } from '@/hooks/useCampaignAttribution';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowRight, Mail, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';

export function RevenueAttributionPanel() {
  const { data: campaigns = [] } = useMarketingCampaigns();
  const { data: attributions = [] } = useAllCampaignAttributions();

  if (attributions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Atribuição de Receita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6 text-sm">
            Sem dados de atribuição. Receita é calculada quando contactos que interagiram com campanhas fecham deals.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Map campaign names
  const chartData = attributions
    .map(a => {
      const campaign = campaigns.find(c => c.id === a.campaignId);
      return {
        name: campaign?.name?.substring(0, 20) || 'Campanha',
        attributed: a.revenueAttributed,
        influenced: a.revenueInfluenced,
        opps: a.opportunitiesCount,
      };
    })
    .sort((a, b) => (b.attributed + b.influenced) - (a.attributed + a.influenced))
    .slice(0, 8);

  const totalAttributed = attributions.reduce((s, a) => s + a.revenueAttributed, 0);
  const totalInfluenced = attributions.reduce((s, a) => s + a.revenueInfluenced, 0);
  const totalOpps = attributions.reduce((s, a) => s + a.opportunitiesCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          Atribuição de Receita
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">
              Campanhas que influenciaram deals
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">€{totalAttributed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Atribuída</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-500">€{totalInfluenced.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Influenciada</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                {totalOpps}
              </div>
              <div className="text-xs text-muted-foreground">Oportunidades</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip
              formatter={(v: number, name: string) => [
                `€${v.toLocaleString()}`,
                name === 'attributed' ? 'Atribuída' : 'Influenciada',
              ]}
            />
            <Legend formatter={(value) => value === 'attributed' ? 'Atribuída' : 'Influenciada'} />
            <Bar dataKey="attributed" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} stackId="revenue" />
            <Bar dataKey="influenced" fill="hsl(160, 60%, 45%)" radius={[0, 4, 4, 0]} stackId="revenue" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
