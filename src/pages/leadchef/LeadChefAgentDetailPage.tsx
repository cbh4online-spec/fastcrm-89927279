import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefPermissionGate } from "@/components/leadchef/LeadChefPermissionGate";
import { LeadChefTeamMetricCard } from "@/components/leadchef/LeadChefTeamMetricCard";
import { LeadChefTeamDateRangeSelector } from "@/components/leadchef/LeadChefTeamDateRangeSelector";
import { LeadChefRoleBadge } from "@/components/leadchef/LeadChefRoleBadge";
import { LeadChefLeadStageBadge } from "@/components/leadchef/LeadChefLeadStageBadge";
import { Button } from "@/components/ui/button";
import { useLeadChefAgentOverview } from "@/hooks/leadchef/useLeadChefAgentOverview";
import { useLeadChefTeamMembers } from "@/hooks/leadchef/useLeadChefTeamMembers";
import { LEADCHEF_APPOINTMENT_TYPE_LABELS } from "@/components/leadchef/constants";
import type { LeadChefPeriod } from "@/utils/leadchef/period";

export default function LeadChefAgentDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<LeadChefPeriod>("month");

  return (
    <LeadChefMobileShell title="Agente" showFab={false}>
      <LeadChefPermissionGate requireManager>
        <Inner userId={userId} period={period} setPeriod={setPeriod} navigate={navigate} />
      </LeadChefPermissionGate>
    </LeadChefMobileShell>
  );
}

function Inner({
  userId,
  period,
  setPeriod,
  navigate,
}: {
  userId?: string;
  period: LeadChefPeriod;
  setPeriod: (p: LeadChefPeriod) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: members } = useLeadChefTeamMembers();
  const member = members?.find((m) => m.userId === userId);
  const { data, isLoading, isError } = useLeadChefAgentOverview(userId, period);

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
        Não foi possível carregar o agente.
      </div>
    );
  }

  return (
    <>
      <header className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <button onClick={() => navigate(-1)} className="text-xs text-slate-500 inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <h1 className="text-xl font-bold text-slate-900">{member?.name ?? "Agente"}</h1>
        <div className="mt-1 flex items-center gap-2">
          {member && <LeadChefRoleBadge role={member.role} />}
          {member?.email && <span className="text-xs text-slate-500">{member.email}</span>}
        </div>
        <div className="mt-3"><LeadChefTeamDateRangeSelector value={period} onChange={setPeriod} /></div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <LeadChefTeamMetricCard label="Leads criados" value={data.leadsCreated} />
        <LeadChefTeamMetricCard label="Leads ativos" value={data.leadsContacted} />
        <LeadChefTeamMetricCard label="Ações OK" value={data.actionsCompleted} tone="success" />
        <LeadChefTeamMetricCard label="Demos marcadas" value={data.demosScheduled} />
        <LeadChefTeamMetricCard label="Demos feitas" value={data.demosCompleted} />
        <LeadChefTeamMetricCard label="Vendas" value={data.sales} tone="success" />
        <LeadChefTeamMetricCard label="Referências" value={data.referrals} />
        <LeadChefTeamMetricCard label="Recrutamento" value={data.recruitments} />
        <LeadChefTeamMetricCard label="Em atraso" value={data.overdueActions} tone={data.overdueActions ? "danger" : "default"} />
        <LeadChefTeamMetricCard label="Conv. Lead→Demo" value={`${data.conversionLeadToDemo}%`} />
        <LeadChefTeamMetricCard label="Conv. Demo→Venda" value={`${data.conversionDemoToSale}%`} />
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Próximos compromissos</h2>
        {data.upcomingAppointments.length === 0 ? (
          <p className="text-xs text-slate-500">Sem compromissos agendados.</p>
        ) : (
          <ul className="space-y-2">
            {data.upcomingAppointments.map((a) => (
              <li key={a.id} className="text-xs text-slate-700 flex items-center justify-between gap-2">
                <span className="truncate">
                  <span className="font-medium text-slate-900">{a.title ?? LEADCHEF_APPOINTMENT_TYPE_LABELS[a.type as keyof typeof LEADCHEF_APPOINTMENT_TYPE_LABELS] ?? a.type}</span>
                </span>
                <span className="text-slate-500 shrink-0">
                  {new Date(a.scheduled_at).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Leads recentes</h2>
        {data.recentLeads.length === 0 ? (
          <p className="text-xs text-slate-500">Sem leads.</p>
        ) : (
          <ul className="space-y-2">
            {data.recentLeads.map((l) => (
              <li key={l.id}>
                <Button
                  variant="ghost"
                  className="w-full h-auto justify-between p-2"
                  onClick={() => navigate(`/dashboard/leadchef/leads/${l.id}`)}
                >
                  <span className="truncate text-sm font-medium text-slate-900">{l.name}</span>
                  <LeadChefLeadStageBadge stage={l.stage} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
