import { NexusSummaryCard } from "./NexusSummaryCard";
import { useLeads } from "@/hooks/useLeads";
import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface NexusLeadsDonutProps {
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  won: { label: "Ganhos", color: "hsl(142 76% 36%)" },
  lost: { label: "Perdidos", color: "hsl(var(--muted-foreground))" },
  contacted: { label: "Contactados", color: "hsl(271 91% 65%)" },
  new: { label: "Novos", color: "hsl(199 89% 48%)" },
  qualified: { label: "Qualificados", color: "hsl(38 92% 50%)" },
};

export function NexusLeadsDonut({ isLoading = false }: NexusLeadsDonutProps) {
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const loading = isLoading || leadsLoading;

  const { chartData, total, mainPercent, summaryItems } = useMemo(() => {
    if (!leads || leads.length === 0) {
      return { 
        chartData: [], 
        total: 0, 
        mainPercent: 0, 
        summaryItems: [] 
      };
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
    const qualifiedCount = statusCounts["qualified"] || 0;
    const qualifiedPercent = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0;

    const items = Object.entries(statusCounts)
      .slice(0, 3)
      .map(([status, count]) => ({
        label: statusConfig[status]?.label || status,
        value: count.toString(),
        color: statusConfig[status]?.color,
      }));

    return {
      chartData: data,
      total: totalLeads,
      mainPercent: qualifiedPercent,
      summaryItems: items,
    };
  }, [leads]);

  return (
    <NexusSummaryCard
      title="Leads por Estado"
      items={summaryItems}
      isLoading={loading}
    >
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number, name: string) => [value, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
          <span className="text-3xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">Total Leads</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
            <span className="text-xs font-medium">({entry.value})</span>
          </div>
        ))}
      </div>
    </NexusSummaryCard>
  );
}
