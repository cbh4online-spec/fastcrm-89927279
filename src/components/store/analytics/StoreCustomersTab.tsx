import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fadeIn, PIE_COLORS } from "./AnalyticsChartHelpers";

interface StoreCustomersTabProps {
  customerMetrics: { data: any; isLoading: boolean };
}

export function StoreCustomersTab({ customerMetrics }: StoreCustomersTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div {...fadeIn}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Novos vs Recorrentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {customerMetrics.isLoading ? (
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              ) : (
                <>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Novos", value: customerMetrics.data?.newCount || 0 },
                          { name: "Recorrentes", value: customerMetrics.data?.returningCount || 0 },
                        ]}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        dataKey="value"
                        strokeWidth={2}
                      >
                        {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span>Novos ({customerMetrics.data?.newCount || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-warning" />
                      <span>Recorrentes ({customerMetrics.data?.returningCount || 0})</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Top 10 Clientes por Valor</CardTitle>
            </CardHeader>
            <CardContent>
              {customerMetrics.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (customerMetrics.data?.customers || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total Gasto</TableHead>
                        <TableHead className="text-right">Encomendas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(customerMetrics.data?.customers || []).map((c: any, i: number) => (
                        <TableRow key={c.email}>
                          <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{c.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold">€{c.totalSpent.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={c.orderCount > 1 ? "default" : "outline"} className="text-xs">
                              {c.orderCount}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
