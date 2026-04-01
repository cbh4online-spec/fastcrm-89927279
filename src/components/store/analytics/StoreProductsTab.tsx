import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn } from "./AnalyticsChartHelpers";

interface StoreProductsTabProps {
  topProducts: { data: any[] | undefined; isLoading: boolean };
}

export function StoreProductsTab({ topProducts }: StoreProductsTabProps) {
  return (
    <div className="space-y-6">
      <motion.div {...fadeIn}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (topProducts.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados de produtos</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Produto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                      <TableHead className="min-w-[120px]">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topProducts.data || []).map((p: any, i: number) => {
                      const stockPct = p.trackStock ? Math.min(100, ((p.stockQuantity ?? 0) / 50) * 100) : 100;
                      const isLow = p.trackStock && (p.stockQuantity ?? 0) <= 5;
                      const isOut = p.stockStatus === "out_of_stock" || (p.trackStock && (p.stockQuantity ?? 0) <= 0);
                      return (
                        <TableRow key={p.productId + i}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                <div className="flex gap-1 mt-0.5">
                                  {i === 0 && <Badge className="text-[10px] h-4 px-1 bg-warning/10 text-warning border-warning/30" variant="outline">Best Seller</Badge>}
                                  {isOut && <Badge className="text-[10px] h-4 px-1" variant="destructive">Esgotado</Badge>}
                                  {isLow && !isOut && <Badge className="text-[10px] h-4 px-1 bg-warning/10 text-warning border-warning/30" variant="outline">Stock Baixo</Badge>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{p.totalQuantity}</TableCell>
                          <TableCell className="text-right font-semibold">€{p.totalRevenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{p.views || 0}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn("font-medium", (p.conversionRate ?? 0) > 5 ? "text-success" : "text-muted-foreground")}>
                              {(p.conversionRate ?? 0).toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {p.trackStock ? (
                              <div className="flex items-center gap-2">
                                <Progress value={stockPct} className="h-2 w-16" />
                                <span className={cn("text-xs font-medium", isOut ? "text-destructive" : isLow ? "text-warning" : "text-muted-foreground")}>
                                  {p.stockQuantity ?? 0}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
