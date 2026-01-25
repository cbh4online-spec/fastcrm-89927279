import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/hooks/useLeads";
import { useMemo } from "react";
import { MoreHorizontal, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface LeadsByStatusChartProps {
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  won: { label: "Ganhos", color: "hsl(142 76% 36%)" },
  lost: { label: "Perdidos", color: "hsl(var(--muted-foreground))" },
  contacted: { label: "Contactados", color: "hsl(271 91% 65%)" },
  new: { label: "Novos", color: "hsl(199 89% 48%)" },
  qualified: { label: "Qualificados", color: "hsl(38 92% 50%)" },
};

export function LeadsByStatusChart({ isLoading = false }: LeadsByStatusChartProps) {
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const loading = isLoading || leadsLoading;

  const { chartData, total, mainPercent, trend } = useMemo(() => {
    if (!leads || leads.length === 0) {
      return { chartData: [], total: 0, mainPercent: 0, trend: 0 };
    }

    const statusCounts: Record<string, number> = {};
    leads.forEach((lead: any) => {
      const status = lead.status || "new";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const data = Object.entries(statusCounts).map(([status, count]) => ({
      name: statusConfig[status]?.label || status,
      value: count,
      color: statusConfig[status]?.color || "hsl(var(--muted))",
    }));

    const totalLeads = leads.length;
    const contactedCount = statusCounts["contacted"] || 0;
    const contactedPercent = totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0;

    return {
      chartData: data,
      total: totalLeads,
      mainPercent: contactedPercent,
      trend: 10, // Mock trend
    };
  }, [leads]);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Leads por Estado</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold">{formatNumber(total)}</span>
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3" />
            <span>{trend}%</span>
          </div>
        </div>

        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-2xl font-bold">{mainPercent}%</span>
            <span className="text-xs text-muted-foreground">Contactados</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
