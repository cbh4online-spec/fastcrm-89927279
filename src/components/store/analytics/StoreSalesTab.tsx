import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { StatusTooltip, fadeIn, DAY_NAMES } from "./AnalyticsChartHelpers";

interface StoreSalesTabProps {
  statusBreakdown: { data: any[] | undefined; isLoading: boolean };
  salesHeatmap: { data: any[] | undefined; isLoading: boolean };
}

export function StoreSalesTab({ statusBreakdown, salesHeatmap }: StoreSalesTabProps) {
  return (
    <div className="space-y-6">
      <motion.div {...fadeIn}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Encomendas por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusBreakdown.data || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "dd/MM")} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<StatusTooltip />} />
                  <Legend />
                  <Bar dataKey="paid" name="Pago" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="processing" name="Processamento" stackId="a" fill="hsl(var(--info))" />
                  <Bar dataKey="shipped" name="Enviado" stackId="a" fill="hsl(var(--warning))" />
                  <Bar dataKey="delivered" name="Entregue" stackId="a" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapa de Calor – Vendas por Dia/Hora</CardTitle>
          </CardHeader>
          <CardContent>
            {salesHeatmap.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <SalesHeatmap data={salesHeatmap.data || []} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            {salesHeatmap.isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <WeekdayChart data={salesHeatmap.data || []} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function SalesHeatmap({ data }: { data: { day: number; hour: number; count: number }[] }) {
  const maxCount = Math.max(1, ...data.map(d => d.count));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-[2px]">
          <div />
          {hours.map(h => (
            <div key={h} className="text-[10px] text-center text-muted-foreground font-medium">
              {h}h
            </div>
          ))}
          {[1, 2, 3, 4, 5, 6, 0].map(day => (
            <>
              <div key={`label-${day}`} className="text-xs text-muted-foreground font-medium flex items-center">
                {DAY_NAMES[day]}
              </div>
              {hours.map(h => {
                const cell = data.find(d => d.day === day && d.hour === h);
                const intensity = cell ? cell.count / maxCount : 0;
                return (
                  <div
                    key={`${day}-${h}`}
                    className="aspect-square rounded-sm transition-colors"
                    style={{
                      backgroundColor: intensity > 0
                        ? `hsl(var(--primary) / ${0.1 + intensity * 0.8})`
                        : "hsl(var(--muted))",
                    }}
                    title={`${DAY_NAMES[day]} ${h}h: ${cell?.count || 0} vendas`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekdayChart({ data }: { data: { day: number; revenue: number }[] }) {
  const grouped = [1, 2, 3, 4, 5, 6, 0].map(day => ({
    name: DAY_NAMES[day],
    revenue: data.filter(d => d.day === day).reduce((sum, d) => sum + d.revenue, 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={grouped}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} width={60} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                <p className="font-medium">{payload[0].payload.name}</p>
                <p className="text-primary font-semibold">€{(payload[0].value as number)?.toFixed(2)}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
