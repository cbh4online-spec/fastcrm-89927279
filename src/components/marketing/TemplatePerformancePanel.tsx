import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Trophy, TrendingDown } from 'lucide-react';
import { useState } from 'react';

export function TemplatePerformancePanel() {
  const { currentWorkspace } = useWorkspace();
  const [period, setPeriod] = useState('30');

  const { data: templateRanking = [] } = useQuery({
    queryKey: ['template-performance', currentWorkspace?.id, period],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const cutoff = new Date(Date.now() - Number(period) * 86400000).toISOString();

      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('template_id, sent_count, delivered_count, opened_count, clicked_count')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'sent')
        .gte('completed_at', cutoff)
        .not('template_id', 'is', null);

      if (!campaigns || campaigns.length === 0) return [];

      // Get template names
      const templateIds = [...new Set(campaigns.map(c => c.template_id).filter(Boolean))] as string[];
      const { data: templates } = await supabase
        .from('marketing_templates')
        .select('id, name')
        .in('id', templateIds);

      const nameMap = new Map((templates || []).map(t => [t.id, t.name]));

      // Aggregate by template
      const grouped: Record<string, { name: string; campaigns: number; delivered: number; opened: number; clicked: number }> = {};
      campaigns.forEach(c => {
        const tid = c.template_id!;
        if (!grouped[tid]) grouped[tid] = { name: nameMap.get(tid) || 'Sem nome', campaigns: 0, delivered: 0, opened: 0, clicked: 0 };
        grouped[tid].campaigns++;
        grouped[tid].delivered += c.delivered_count || 0;
        grouped[tid].opened += c.opened_count || 0;
        grouped[tid].clicked += c.clicked_count || 0;
      });

      return Object.entries(grouped)
        .map(([id, v]) => ({
          id,
          ...v,
          openRate: v.delivered > 0 ? (v.opened / v.delivered) * 100 : 0,
          clickRate: v.delivered > 0 ? (v.clicked / v.delivered) * 100 : 0,
        }))
        .sort((a, b) => b.openRate - a.openRate);
    },
    enabled: !!currentWorkspace?.id,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Performance de Templates
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">180 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {templateRanking.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sem dados de templates no período.</p>
        ) : (
          <div className="space-y-2">
            {templateRanking.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                <div className="w-6 text-center">
                  {i === 0 ? <Trophy className="h-4 w-4 text-amber-500 mx-auto" /> : (
                    <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.campaigns} campanhas</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="text-center">
                    <div className="font-medium">{t.openRate.toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">Abertura</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{t.clickRate.toFixed(1)}%</div>
                    <div className="text-[10px] text-muted-foreground">Cliques</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
