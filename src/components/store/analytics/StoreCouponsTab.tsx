import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fadeIn } from "./AnalyticsChartHelpers";

interface StoreCouponsTabProps {
  couponMetrics: { data: any[] | undefined; isLoading: boolean };
}

export function StoreCouponsTab({ couponMetrics }: StoreCouponsTabProps) {
  return (
    <div className="space-y-6">
      <motion.div {...fadeIn}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance de Cupões</CardTitle>
          </CardHeader>
          <CardContent>
            {couponMetrics.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (couponMetrics.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum cupão criado</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead className="text-right">Utilizações</TableHead>
                      <TableHead className="text-right">Desconto Total</TableHead>
                      <TableHead className="text-right">Receita Gerada</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(couponMetrics.data || []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span className="font-mono font-semibold text-sm bg-muted px-2 py-1 rounded">{c.code}</span>
                        </TableCell>
                        <TableCell>
                          {c.discountType === "percentage" ? `${c.discountValue}%` : `€${c.discountValue.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-right font-medium">{c.usedCount}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">-€{c.totalDiscountGiven.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-success font-semibold">€{c.revenueGenerated.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">
                            {c.isActive ? "Ativo" : "Inativo"}
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
  );
}
