import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Demo data
const generateSalesData = (period: string) => {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  
  if (period === "weekly") {
    return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((day) => ({
      name: day,
      leads: Math.floor(Math.random() * 20 + 5),
      proposals: Math.floor(Math.random() * 10 + 2),
      closed: Math.floor(Math.random() * 5 + 1),
    }));
  }

  return months.map((month) => ({
    name: month,
    leads: Math.floor(Math.random() * 100 + 30),
    proposals: Math.floor(Math.random() * 50 + 15),
    closed: Math.floor(Math.random() * 25 + 5),
  }));
};

interface SalesProgressionChartProps {
  isLoading?: boolean;
}

export function SalesProgressionChart({ isLoading = false }: SalesProgressionChartProps) {
  const [period, setPeriod] = useState("monthly");
  const data = generateSalesData(period);

  if (isLoading) {
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
            <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
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
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
