import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, CalendarCheck, AlertTriangle, Trophy, UserPlus, Sparkles } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefPermissionGate } from "@/components/leadchef/LeadChefPermissionGate";
import { LeadChefTeamMetricCard } from "@/components/leadchef/LeadChefTeamMetricCard";
import { LeadChefTeamAlerts } from "@/components/leadchef/LeadChefTeamAlerts";
import { LeadChefTeamStageDistribution } from "@/components/leadchef/LeadChefTeamStageDistribution";
import { LeadChefAgentCard } from "@/components/leadchef/LeadChefAgentCard";
import { LeadChefAgentFilter } from "@/components/leadchef/LeadChefAgentFilter";
import { LeadChefTeamDateRangeSelector } from "@/components/leadchef/LeadChefTeamDateRangeSelector";
import { LeadChefTeamEmptyState } from "@/components/leadchef/LeadChefTeamEmptyState";
import { useLeadChefTeamOverview } from "@/hooks/leadchef/useLeadChefTeamOverview";
import { useLeadChefTeamAlerts } from "@/hooks/leadchef/useLeadChefTeamAlerts";
import type { LeadChefPeriod } from "@/utils/leadchef/period";

export default function LeadChefEquipaPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<LeadChefPeriod>("month");
  const [agentId, setAgentId] = useState<string | "all">("all");

  return (
    <LeadChefMobileShell title="Equipa" subtitle="Acompanha atividade, objetivos e oportunidades por agente." showFab={false}>
      <LeadChefPermissionGate requireManager>
        <EquipaContent period={period} setPeriod={setPeriod} agentId={agentId} setAgentId={setAgentId} navigate={navigate} />
      </LeadChefPermissionGate>
    </LeadChefMobileShell>
  );
}

interface ContentProps {
  period: LeadChefPeriod;
  setPeriod: (p: LeadChefPeriod) => void;
  agentId: string | "all";
  setAgentId: (id: string | "all") => void;
  navigate: ReturnType<typeof useNavigate>;
}

function EquipaContent({ period, setPeriod, agentId, setAgentId, navigate }: ContentProps) {
  const { data, isLoading, isError } = useLeadChefTeamOverview(period);
  const { data: alerts, isLoading: alertsLoading } = useLeadChefTeamAlerts();

  const filteredAgents = useMemo(() => {
    if (!data) return [];
    if (agentId === "all") return data.agentSummaries;
    return data.agentSummaries.filter((a) => a.member.userId === agentId);
  }, [data, agentId]);

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    if (agentId === "all") return alerts;
    return alerts.filter((a) => a.userId === agentId);
  }, [alerts, agentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-600">
        Não foi possível carregar a visão de equipa.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <LeadChefTeamDateRangeSelector value={period} onChange={setPeriod} />
        <div className="min-w-[180px] flex-1 max-w-[260px]">
          <LeadChefAgentFilter value={agentId} onChange={setAgentId} />
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <LeadChefTeamMetricCard label="Leads novos" value={data.totalLeadsCreated} icon={UserPlus} />
        <LeadChefTeamMetricCard label="Ações OK" value={data.totalActionsCompleted} icon={CalendarCheck} tone="success" />
        <LeadChefTeamMetricCard label="Em atraso" value={data.totalOverdueActions} icon={AlertTriangle} tone={data.totalOverdueActions ? "danger" : "default"} />
        <LeadChefTeamMetricCard label="Demos marcadas" value={data.totalDemosScheduled} />
        <LeadChefTeamMetricCard label="Demos feitas" value={data.totalDemosCompleted} />
        <LeadChefTeamMetricCard label="Vendas" value={data.totalSalesWon} icon={Trophy} tone="success" />
        <LeadChefTeamMetricCard label="Referências" value={data.totalReferrals} icon={Sparkles} />
        <LeadChefTeamMetricCard label="Recrutamento" value={data.totalRecruitmentPotentials} />
        <LeadChefTeamMetricCard label="Conv. Lead→Demo" value={`${data.conversionLeadToDemo}%`} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 px-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertas da equipa
        </h2>
        <LeadChefTeamAlerts alerts={filteredAlerts} isLoading={alertsLoading} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 px-1 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" /> Agentes
        </h2>
        {filteredAgents.length === 0 ? (
          <LeadChefTeamEmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredAgents.map((s) => (
              <LeadChefAgentCard
                key={s.member.userId}
                summary={s}
                onClick={() => navigate(`/dashboard/leadchef/equipa/${s.member.userId}`)}
              />
            ))}
          </div>
        )}
      </section>

      <LeadChefTeamStageDistribution distribution={data.stageDistribution} />
    </>
  );
}
