import { Activity, CalendarDays, Sparkles, Target, Phone, FileText, AlertCircle, TrendingUp, ChevronRight, Loader2, MessageSquare, Settings2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefPendingMessagesBlock } from "@/components/leadchef/LeadChefPendingMessagesBlock";
import { LeadChefTodayCard } from "@/components/leadchef/LeadChefTodayCard";
import { LeadChefLeadStageBadge } from "@/components/leadchef/LeadChefLeadStageBadge";
import { LeadChefAlertActionCard } from "@/components/leadchef/LeadChefAlertActionCard";
import { LeadChefWhatsAppActionSheet } from "@/components/leadchef/LeadChefWhatsAppActionSheet";
import { Progress } from "@/components/ui/progress";
import { useLeadChefToday } from "@/hooks/leadchef/useLeadChefToday";
import { useLeadChefActionableAlerts } from "@/hooks/leadchef/useLeadChefActionableAlerts";
import { LEADCHEF_ACTIVITY_LABELS } from "@/components/leadchef/constants";
import type { LeadChefTodayAction } from "@/types/leadchef";
import type { LeadChefActionableAlert } from "@/types/leadchefTemplates";


const TYPE_ICON = {
  phone_call: Phone,
  whatsapp: MessageSquare,
  demo: CalendarDays,
  follow_up: FileText,
} as const;

function ActionRow({ action, onClick }: { action: LeadChefTodayAction; onClick: () => void }) {
  const Icon = (action.type && TYPE_ICON[action.type as keyof typeof TYPE_ICON]) || FileText;
  const time = action.scheduledAt
    ? new Date(action.scheduledAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <button onClick={onClick} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
      <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {action.type ? LEADCHEF_ACTIVITY_LABELS[action.type] : "Ação"} — {action.leadName}
        </p>
        {action.note && <p className="text-xs text-slate-500 truncate mt-0.5">{action.note}</p>}
        <div className="mt-2 flex items-center gap-2">
          <LeadChefLeadStageBadge stage={action.stage} />
          {time && <span className="text-[11px] text-slate-500">{time}</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400 mt-2" />
    </button>
  );
}

function EmptyMini({ message }: { message: string }) {
  return <div className="px-4 py-6 text-center text-xs text-slate-500">{message}</div>;
}

export default function LeadChefTodayPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useLeadChefToday();
  const { data: alerts = [] } = useLeadChefActionableAlerts();
  const goToLead = (leadId: string) => navigate(`/dashboard/leadchef/leads/${leadId}`);

  const [waOpen, setWaOpen] = useState(false);
  const [waAlert, setWaAlert] = useState<LeadChefActionableAlert | null>(null);
  const onAlertSendMessage = (a: LeadChefActionableAlert) => {
    setWaAlert(a);
    setWaOpen(true);
  };

  if (isLoading) {
    return (
      <LeadChefMobileShell title="Hoje" subtitle="A carregar dados…">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </LeadChefMobileShell>
    );
  }

  if (isError || !data) {
    return (
      <LeadChefMobileShell title="Hoje" subtitle="O que precisa da tua atenção agora.">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">Não foi possível carregar os dados do LeadChef.</p>
        </div>
      </LeadChefMobileShell>
    );
  }

  const totalActionsToday = data.todayActions.length + data.overdueActions.length;
  const goalPct = data.monthlyProgress.percent;

  return (
    <LeadChefMobileShell title="Hoje" subtitle="O que precisa da tua atenção agora.">
      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3">
        <LeadChefTodayCard
          icon={Activity}
          label="Ações hoje"
          value={totalActionsToday}
          hint={data.overdueActions.length ? `${data.overdueActions.length} em atraso` : "Tudo em dia"}
          tone="emerald"
        />
        <LeadChefTodayCard
          icon={CalendarDays}
          label="Demonstrações"
          value={data.scheduledDemos.length}
          hint="Agendadas"
          tone="sky"
        />
        <LeadChefTodayCard
          icon={Sparkles}
          label="Leads novos"
          value={data.newLeadsWithoutContact.length}
          hint="Sem primeiro contacto"
          tone="amber"
        />
        <LeadChefTodayCard
          icon={Target}
          label="Objetivo mês"
          value={`${goalPct}%`}
          hint={
            data.monthlyProgress.salesGoal > 0
              ? `${data.monthlyProgress.salesDone} de ${data.monthlyProgress.salesGoal} vendas`
              : "Sem objetivo definido"
          }
          tone="slate"
        />
      </section>

      <LeadChefPendingMessagesBlock />

      
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Prioridades do dia</h2>
          <span className="text-xs text-slate-500">{totalActionsToday} ações</span>
        </div>
        {totalActionsToday === 0 ? (
          <EmptyMini message="Sem ações agendadas para hoje." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...data.overdueActions, ...data.todayActions].map((a) => (
              <li key={a.id}><ActionRow action={a} onClick={() => goToLead(a.leadId)} /></li>
            ))}
          </ul>
        )}
      </section>

      {/* Sem seguimento */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Leads sem seguimento</h2>
        </div>
        {data.newLeadsWithoutContact.length === 0 ? (
          <EmptyMini message="Sem leads pendentes de primeiro contacto." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.newLeadsWithoutContact.slice(0, 6).map((l) => (
              <li
                key={l.id}
                onClick={() => goToLead(l.leadId)}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{l.leadName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Aguarda primeiro contacto</p>
                </div>
                <LeadChefLeadStageBadge stage={l.stage} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Progresso mensal */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">Progresso mensal</h2>
          </div>
          <button
            onClick={() => navigate("/dashboard/leadchef/objetivos")}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Ver objetivos →
          </button>
        </div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-slate-900">{goalPct}%</span>
          <span className="text-xs text-slate-500">
            {data.monthlyProgress.salesDone} / {data.monthlyProgress.salesGoal || "—"} vendas
          </span>
        </div>
        <Progress value={goalPct} className="h-2" />
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="font-semibold text-slate-900">{data.monthlyProgress.salesDone} de {data.monthlyProgress.salesGoal || "—"}</p>
            <p>Vendas</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="font-semibold text-slate-900">{data.monthlyProgress.demosDone} de {data.monthlyProgress.demosGoal || "—"}</p>
            <p>Demonstrações</p>
          </div>
        </div>
        {data.monthlyProgress.salesGoal === 0 && (
          <p className="text-xs text-slate-500 mt-2">
            Define o teu objetivo mensal em <span className="font-medium">Objetivos</span>.
          </p>
        )}
      </section>

      {alerts.length > 0 && (
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-semibold text-slate-900">Alertas importantes</h2>
            <span className="ml-auto text-xs text-slate-500">{alerts.length}</span>
          </div>
          <div className="p-3 space-y-2">
            {alerts.slice(0, 8).map((a) => (
              <LeadChefAlertActionCard key={a.id} alert={a} onSendMessage={onAlertSendMessage} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Configurações</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/dashboard/leadchef/templates")}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            Templates
          </button>
          <button
            onClick={() => navigate("/dashboard/leadchef/automacoes")}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            Automações
          </button>
          <button
            onClick={() => navigate("/dashboard/leadchef/ferramentas")}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 col-span-2"
          >
            Ferramentas (Importar / Exportar / Auditoria)
          </button>
        </div>
      </section>

      <LeadChefWhatsAppActionSheet
        open={waOpen}
        onOpenChange={(o) => { setWaOpen(o); if (!o) setWaAlert(null); }}
        phone={null}
        recipientName={null}
        entityKind={waAlert?.entityType === "referral" ? "referral" : waAlert?.entityType === "client" ? "client" : "lead"}
        leadId={waAlert && (waAlert.entityType === "lead" || waAlert.entityType === "client") ? waAlert.entityId : null}
        preferredCategory={waAlert?.templateCategory}
      />
    </LeadChefMobileShell>
  );
}
