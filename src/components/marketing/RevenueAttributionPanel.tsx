import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowRight, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export function RevenueAttributionPanel() {
  const { currentWorkspace } = useWorkspace();
  const { data: campaigns = [] } = useMarketingCampaigns();

  const { data: attribution = [] } = useQuery({
    queryKey: ['campaign-revenue-attribution', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      // Get contacts who clicked campaign links
      const clicksResult = await supabase
        .from('campaign_link_clicks')
        .select('campaign_id, contact_id')
        .eq('workspace_id', currentWorkspace.id);
      
      const clicks = (clicksResult.data || []) as Array<{ campaign_id: string; contact_id: string | null }>;

      if (clicks.length === 0) return [];

      // Get unique contact IDs who interacted
      const contactIds = [...new Set(clicks.filter(c => c.contact_id).map(c => c.contact_id!))];
      if (contactIds.length === 0) return [];

      // Get won opportunities for those contacts
      const oppsResult = await (supabase as any)
        .from('opportunities')
        .select('id, value, contact_id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('stage', 'won')
        .in('contact_id', contactIds);
      
      const opportunities = (oppsResult.data || []) as Array<{ id: string; value: number | null; contact_id: string | null }>;

      if (!opportunities || opportunities.length === 0) return [];

      // Map revenue to campaigns
      const campaignRevenue = new Map<string, number>();
      const contactCampaigns = new Map<string, string[]>();

      clicks.forEach(click => {
        if (click.contact_id) {
          const existing = contactCampaigns.get(click.contact_id) || [];
          if (!existing.includes(click.campaign_id)) {
            contactCampaigns.set(click.contact_id, [...existing, click.campaign_id]);
          }
        }
      });

      opportunities.forEach(opp => {
        if (opp.contact_id && opp.value) {
          const relatedCampaigns = contactCampaigns.get(opp.contact_id) || [];
          const share = opp.value / Math.max(relatedCampaigns.length, 1);
          relatedCampaigns.forEach(cId => {
            campaignRevenue.set(cId, (campaignRevenue.get(cId) || 0) + share);
          });
        }
      });

      return Array.from(campaignRevenue.entries())
        .map(([campaignId, revenue]) => {
          const campaign = campaigns.find(c => c.id === campaignId);
          return {
            name: campaign?.name?.substring(0, 20) || 'Campanha',
            revenue: Math.round(revenue),
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
    },
    enabled: !!currentWorkspace?.id && campaigns.length > 0,
  });

  const totalRevenue = attribution.reduce((s, a) => s + a.revenue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          Atribuição de Receita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attribution.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Campanhas que influenciaram deals fechados
              </span>
              <span className="ml-auto text-lg font-bold text-green-600">
                €{totalRevenue.toLocaleString()}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => [`€${v.toLocaleString()}`, 'Receita']} />
                <Bar dataKey="revenue" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Sem dados de atribuição. Receita é calculada quando contactos que clicaram em campanhas fecham deals.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
