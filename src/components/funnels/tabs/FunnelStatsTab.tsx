import { useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon, RotateCcw, Eye, FileText, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useFunnelSteps, useFunnelStepStats } from "@/hooks/useFunnels";
import { Mail } from "lucide-react";

interface FunnelStatsTabProps {
  funnelId: string;
}

export function FunnelStatsTab({ funnelId }: FunnelStatsTabProps) {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: steps = [] } = useFunnelSteps(funnelId);
  const { data: rawStats = [] } = useFunnelStepStats(funnelId, dateFrom, dateTo);

  // Aggregate stats by step
  const statsByStep: Record<string, Record<string, number>> = {};
  for (const stat of rawStats) {
    const stepId = stat.step_id;
    if (!statsByStep[stepId]) statsByStep[stepId] = {};
    statsByStep[stepId][stat.event_type] = (statsByStep[stepId][stat.event_type] || 0) + (stat.count || 0);
    if (stat.event_type === "sale") {
      statsByStep[stepId]["sale_amount"] = (statsByStep[stepId]["sale_amount"] || 0) + Number(stat.amount || 0);
    }
  }

  const getStat = (stepId: string, type: string) => statsByStep[stepId]?.[type] || 0;

  const handleReset = () => {
    setDateFrom(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    setDateTo(format(new Date(), "yyyy-MM-dd"));
  };

  // Aggregated KPIs across all steps
  const totalViews = steps.reduce((sum, s) => sum + getStat(s.id, "page_view"), 0);
  const totalOptins = steps.reduce((sum, s) => sum + getStat(s.id, "optin"), 0);
  const totalSales = steps.reduce((sum, s) => sum + getStat(s.id, "sale"), 0);
  const totalAmount = steps.reduce((sum, s) => sum + getStat(s.id, "sale_amount"), 0);
  const overallConv = totalViews > 0 ? ((totalOptins / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      {/* Date range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="text-sm text-primary hover:underline cursor-pointer">Compreender stats</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-background">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-0 p-0 h-auto w-auto text-sm min-w-0"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-0 p-0 h-auto w-auto text-sm min-w-0"
            />
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <Button variant="destructive" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium">Total Views</span>
          </div>
          <p className="text-2xl font-bold">{totalViews || "-"}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">Opt-Ins</span>
          </div>
          <p className="text-2xl font-bold">{totalOptins || "-"}</p>
          <p className="text-xs text-muted-foreground">{overallConv}% conv.</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Vendas</span>
          </div>
          <p className="text-2xl font-bold">{totalSales || "-"}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Receita</span>
          </div>
          <p className="text-2xl font-bold">
            {totalAmount > 0 ? `€${totalAmount.toFixed(0)}` : "-"}
          </p>
        </Card>
      </div>

      {/* Stats table with horizontal scroll */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px] whitespace-nowrap" rowSpan={2}></TableHead>
              <TableHead colSpan={2} className="text-center bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-b-0 whitespace-nowrap">Page Views</TableHead>
              <TableHead colSpan={2} className="text-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-0 whitespace-nowrap">Opt-Ins</TableHead>
              <TableHead colSpan={4} className="text-center bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-b-0 whitespace-nowrap">Sales</TableHead>
              <TableHead colSpan={2} className="text-center bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-b-0 whitespace-nowrap">EPV</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-center bg-blue-50 dark:bg-blue-950 text-xs whitespace-nowrap">All</TableHead>
              <TableHead className="text-center bg-blue-50 dark:bg-blue-950 text-xs whitespace-nowrap">Uniques</TableHead>
              <TableHead className="text-center bg-blue-100 dark:bg-blue-900 text-xs whitespace-nowrap">All</TableHead>
              <TableHead className="text-center bg-blue-100 dark:bg-blue-900 text-xs whitespace-nowrap">Rate</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs whitespace-nowrap">Orders</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs whitespace-nowrap">Rate</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs whitespace-nowrap">Amount</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs whitespace-nowrap">Avg. cart</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950 text-xs whitespace-nowrap">All</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950 text-xs whitespace-nowrap">Uniques</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Sem steps configurados
                </TableCell>
              </TableRow>
            ) : (
              steps.map((step) => {
                const views = getStat(step.id, "page_view");
                const uniques = getStat(step.id, "unique_view");
                const optins = getStat(step.id, "optin");
                const orders = getStat(step.id, "sale");
                const amount = getStat(step.id, "sale_amount");
                const optinRate = views > 0 ? ((optins / views) * 100).toFixed(1) : "-";
                const saleRate = views > 0 ? ((orders / views) * 100).toFixed(1) : "-";
                const avgCart = orders > 0 ? (amount / orders).toFixed(2) : "-";
                const epvAll = views > 0 ? (amount / views).toFixed(2) : "-";
                const epvUnique = uniques > 0 ? (amount / uniques).toFixed(2) : "-";

                return (
                  <TableRow key={step.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[120px]">{step.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">{views || "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{uniques || "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{optins || "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{optinRate}{optinRate !== "-" ? "%" : ""}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{orders || "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{saleRate}{saleRate !== "-" ? "%" : ""}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{amount ? `€${amount.toFixed(2)}` : "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{avgCart !== "-" ? `€${avgCart}` : "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{epvAll !== "-" ? `€${epvAll}` : "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{epvUnique !== "-" ? `€${epvUnique}` : "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
