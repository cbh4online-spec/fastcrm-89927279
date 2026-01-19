import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useProposals } from "@/hooks/useProposals";
import { useOpportunities } from "@/hooks/useOpportunities";
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { pt } from "date-fns/locale";

interface SalesProgressionChartProps {
  isLoading?: boolean;
}

export function SalesProgressionChart({ isLoading = false }: SalesProgressionChartProps) {
  const [period, setPeriod] = useState("monthly");
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();

  const data = useMemo(() => {
    const now = new Date();
    const allLeads = leads || [];
    const allProposals = proposals || [];
    const wonOpportunities = (opportunities || []).filter(o => o.status === "won");

    if (period === "weekly") {
      // Last 8 weeks
      return Array.from({ length: 8 }, (_, i) => {
        const weekDate = subWeeks(now, 7 - i);
        const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
        
        const leadsCount = allLeads.filter(l => 
          isWithinInterval(new Date(l.created_at), { start: weekStart, end: weekEnd })
        ).length;
        
        const proposalsCount = allProposals.filter(p => 
          isWithinInterval(new Date(p.created_at), { start: weekStart, end: weekEnd })
        ).length;
        
        const closedCount = wonOpportunities.filter(o => 
          o.updated_at && isWithinInterval(new Date(o.updated_at), { start: weekStart, end: weekEnd })
        ).length;

        return {
          name: `S${format(weekStart, "w")}`,
          leads: leadsCount,
          proposals: proposalsCount,
          closed: closedCount,
        };
      });
    } else {
      // Last 6 months
      return Array.from({ length: 6 }, (_, i) => {
        const monthDate = subMonths(now, 5 - i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const leadsCount = allLeads.filter(l => 
          isWithinInterval(new Date(l.created_at), { start: monthStart, end: monthEnd })
        ).length;
        
        const proposalsCount = allProposals.filter(p => 
          isWithinInterval(new Date(p.created_at), { start: monthStart, end: monthEnd })
        ).length;
        
        const closedCount = wonOpportunities.filter(o => 
          o.updated_at && isWithinInterval(new Date(o.updated_at), { start: monthStart, end: monthEnd })
        ).length;

        return {
          name: format(monthDate, "MMM", { locale: pt }),
          leads: leadsCount,
          proposals: proposalsCount,
          closed: closedCount,
        };
      });
    }
  }, [leads, proposals, opportunities, period]);

  const loading = isLoading || leadsLoading || proposalsLoading || opportunitiesLoading;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.every(d => d.leads === 0 && d.proposals === 0 && d.closed === 0)) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Progressão de Vendas</CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Sem dados de vendas</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Os dados aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Progressão de Vendas</CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar 
                dataKey="leads" 
                name="Leads" 
                fill="hsl(199 89% 48%)" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="proposals" 
                name="Propostas" 
                fill="hsl(38 92% 50%)" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="closed" 
                name="Fechados" 
                fill="hsl(142 76% 36%)" 
                radius={[4, 4, 0, 0]} 
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
