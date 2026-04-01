import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Package, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn } from "./AnalyticsChartHelpers";

interface StoreInventoryTabProps {
  inventoryAlerts: { data: any; isLoading: boolean };
}

export function StoreInventoryTab({ inventoryAlerts }: StoreInventoryTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div {...fadeIn}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Visão Geral do Stock</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {inventoryAlerts.isLoading ? (
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              ) : (
                <>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Em Stock", value: inventoryAlerts.data?.inStock || 0 },
                          { name: "Baixo", value: inventoryAlerts.data?.lowStock || 0 },
                          { name: "Esgotado", value: inventoryAlerts.data?.outOfStock || 0 },
                        ]}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        dataKey="value"
                        strokeWidth={2}
                      >
                        <Cell fill="hsl(var(--success))" />
                        <Cell fill="hsl(var(--warning))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-4 text-sm flex-wrap justify-center">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-success" />
                      <span>Em Stock ({inventoryAlerts.data?.inStock || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-warning" />
                      <span>Baixo ({inventoryAlerts.data?.lowStock || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-destructive" />
                      <span>Esgotado ({inventoryAlerts.data?.outOfStock || 0})</span>
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
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryAlerts.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (inventoryAlerts.data?.alerts || []).length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 text-success/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Todos os produtos com stock adequado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(inventoryAlerts.data?.alerts || []).map((a: any) => {
                    const isOut = a.stockStatus === "out_of_stock" || a.stockQuantity <= 0;
                    return (
                      <div key={a.productId} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border",
                        isOut ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"
                      )}>
                        {a.image ? (
                          <img src={a.image} alt={a.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <PackageX className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.category || "Sem categoria"}</p>
                        </div>
                        <Badge variant={isOut ? "destructive" : "outline"} className={cn("text-xs", !isOut && "border-warning/50 text-warning")}>
                          {isOut ? "Esgotado" : `${a.stockQuantity} un.`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
