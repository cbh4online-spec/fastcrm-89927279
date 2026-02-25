import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Download, RefreshCw } from "lucide-react";
import { useSalesPerformance } from "@/hooks/useSalesPerformance";

import { SalesKPIStrip } from "@/components/reports/sales/SalesKPIStrip";
import { LeadFlowChart } from "@/components/reports/sales/LeadFlowChart";
import { WonRevenueChart } from "@/components/reports/sales/WonRevenueChart";
import { ARRTrendChart } from "@/components/reports/sales/ARRTrendChart";
import { ConversionFunnel } from "@/components/reports/sales/ConversionFunnel";
import { SalesVelocityCard } from "@/components/reports/sales/SalesVelocityCard";
import { TopPerformersCard } from "@/components/reports/sales/TopPerformersCard";
import { SourceAnalysisChart } from "@/components/reports/sales/SourceAnalysisChart";
import { StageDurationHeatmap } from "@/components/reports/sales/StageDurationHeatmap";

export default function ReportsSales() {
  const { t } = useTranslation("reports");
  const { data, isLoading, refetch } = useSalesPerformance();
  const [period, setPeriod] = useState("quarter");

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("sales_performance")}</h1>
            <p className="text-muted-foreground text-sm">{t("sales_subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{t("this_week")}</SelectItem>
                <SelectItem value="month">{t("this_month")}</SelectItem>
                <SelectItem value="quarter">{t("this_quarter")}</SelectItem>
                <SelectItem value="year">{t("this_year")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <SalesKPIStrip kpis={data?.kpis} isLoading={isLoading} />

        {/* Charts Row 1: Lead Flow + Won Revenue + ARR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LeadFlowChart data={data?.leadFlow} sources={data?.sources} isLoading={isLoading} />
          <WonRevenueChart data={data?.wonRevenueByMonth} isLoading={isLoading} />
          <ARRTrendChart data={data?.arrTrend} isLoading={isLoading} />
        </div>

        {/* Conversion Funnel */}
        <ConversionFunnel data={data?.funnel} isLoading={isLoading} />

        {/* Stage Duration Heatmap */}
        <StageDurationHeatmap data={data?.stageDuration} isLoading={isLoading} />

        {/* Row 3: Velocity + Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesVelocityCard data={data?.velocity} isLoading={isLoading} />
          <TopPerformersCard data={data?.topPerformers} isLoading={isLoading} />
        </div>

        {/* Source Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SourceAnalysisChart data={data?.sourceBreakdown} isLoading={isLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
}
