import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSalesForecast, usePipelines, type ForecastPeriodFilter } from "@/hooks/useSalesForecast";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { ForecastKPIStrip } from "@/components/sales-forecast/ForecastKPIStrip";
import { ForecastByStageChart } from "@/components/sales-forecast/ForecastByStageChart";
import { ForecastByOwnerTable } from "@/components/sales-forecast/ForecastByOwnerTable";
import { ForecastTrendChart } from "@/components/sales-forecast/ForecastTrendChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

const periodOptions: { value: ForecastPeriodFilter; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "quarter", label: "Este trimestre" },
  { value: "year", label: "Este ano" },
  { value: "6months", label: "Últimos 6 meses" },
];

export default function SalesForecastPage() {
  const [pipelineId, setPipelineId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [period, setPeriod] = useState<ForecastPeriodFilter>("quarter");

  const { data: pipelines } = usePipelines();
  const { data: agents } = useAgentMembers();

  const { data, isLoading } = useSalesForecast({
    pipelineId: pipelineId || undefined,
    ownerId: ownerId || undefined,
    period,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Forecast Comercial</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {pipelines?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {agents?.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={(v) => setPeriod(v as ForecastPeriodFilter)}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[88px] w-full" />
              ))}
            </div>
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : (
          <>
            <ForecastKPIStrip kpis={data.kpis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ForecastByStageChart data={data.byStage} />
              <ForecastByOwnerTable data={data.byOwner} />
            </div>

            <ForecastTrendChart data={data.trend} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
