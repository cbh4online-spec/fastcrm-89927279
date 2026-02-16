import { useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon, RotateCcw } from "lucide-react";
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

  return (
    <div className="space-y-4">
      {/* Date range */}
      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-primary hover:underline cursor-pointer">Compreender stats</span>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border-0 p-0 h-auto w-auto text-sm"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border-0 p-0 h-auto w-auto text-sm"
          />
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="destructive" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Stats table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]" rowSpan={2}></TableHead>
              <TableHead colSpan={2} className="text-center bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-b-0">Page Views</TableHead>
              <TableHead colSpan={2} className="text-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-0">Opt-Ins</TableHead>
              <TableHead colSpan={4} className="text-center bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-b-0">Sales</TableHead>
              <TableHead colSpan={2} className="text-center bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-b-0">Earnings/Page View</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-center bg-blue-50 dark:bg-blue-950 text-xs">All</TableHead>
              <TableHead className="text-center bg-blue-50 dark:bg-blue-950 text-xs">Uniques</TableHead>
              <TableHead className="text-center bg-blue-100 dark:bg-blue-900 text-xs">All</TableHead>
              <TableHead className="text-center bg-blue-100 dark:bg-blue-900 text-xs">Rate</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs">Orders</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs">Rate</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs">Amount</TableHead>
              <TableHead className="text-center bg-emerald-50 dark:bg-emerald-950 text-xs">Avg. cart v.</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950 text-xs">All</TableHead>
              <TableHead className="text-center bg-cyan-50 dark:bg-cyan-950 text-xs">Uniques</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step) => {
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{step.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{views || "-"}</TableCell>
                  <TableCell className="text-center">{uniques || "-"}</TableCell>
                  <TableCell className="text-center">{optins || "-"}</TableCell>
                  <TableCell className="text-center">{optinRate}</TableCell>
                  <TableCell className="text-center">{orders || "-"}</TableCell>
                  <TableCell className="text-center">{saleRate}</TableCell>
                  <TableCell className="text-center">{amount || "-"}</TableCell>
                  <TableCell className="text-center">{avgCart}</TableCell>
                  <TableCell className="text-center">{epvAll}</TableCell>
                  <TableCell className="text-center">{epvUnique}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
