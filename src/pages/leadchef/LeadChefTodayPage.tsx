import { Activity, CalendarDays, Sparkles, Target, Phone, CheckCircle2, FileText, AlertCircle, TrendingUp, ChevronRight } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefTodayCard } from "@/components/leadchef/LeadChefTodayCard";
import { LeadChefLeadStageBadge } from "@/components/leadchef/LeadChefLeadStageBadge";
import { Progress } from "@/components/ui/progress";
import type { LeadChefTodayItem } from "@/types/leadchef";

const mockToday: LeadChefTodayItem[] = [
  {
    id: "1",
    title: "Contactar novo lead",
    subtitle: "Maria Silva — entrou pelo Instagram",
    type: "phone_call",
    leadName: "Maria Silva",
    stage: "to_contact",
    priority: "high",
  },
  {
    id: "2",
    title: "Confirmar demonstração",
    subtitle: "Hoje às 18:30 — casa de João Pereira",
    type: "demo",
    leadName: "João Pereira",
    stage: "demo_scheduled",
    priority: "high",
  },
  {
    id: "3",
    title: "Follow-up de proposta",
    subtitle: "Ana Costa — proposta enviada há 3 dias",
    type: "follow_up",
    leadName: "Ana Costa",
    stage: "proposal_decision",
    priority: "medium",
  },
];

const mockNoFollowup = [
  { id: "n1", name: "Rui Tavares", days: 7, stage: "in_conversation" as const },
  { id: "n2", name: "Sofia Mendes", days: 12, stage: "demo_done" as const },
];

const priorityIcon = {
  phone_call: Phone,
  demo: CalendarDays,
  follow_up: FileText,
} as const;

export default function LeadChefTodayPage() {
  const goalProgress = 62;

  return (
    <LeadChefMobileShell title="Hoje" subtitle="O que precisa da tua atenção agora.">
      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3">
        <LeadChefTodayCard icon={Activity} label="Ações hoje" value="6" hint="3 prioritárias" tone="emerald" />
        <LeadChefTodayCard icon={CalendarDays} label="Demonstrações" value="2" hint="Hoje e amanhã" tone="sky" />
        <LeadChefTodayCard icon={Sparkles} label="Leads novos" value="4" hint="Últimas 24h" tone="amber" />
        <LeadChefTodayCard icon={Target} label="Objetivo mês" value={`${goalProgress}%`} hint="8 de 13 vendas" tone="slate" />
      </section>

      {/* Prioridades */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Prioridades do dia</h2>
          <span className="text-xs text-slate-500">{mockToday.length} ações</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {mockToday.map((item) => {
            const Icon = priorityIcon[item.type as keyof typeof priorityIcon] ?? CheckCircle2;
            return (
              <li key={item.id}>
                <button className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                    )}
                    {item.stage && (
                      <div className="mt-2">
                        <LeadChefLeadStageBadge stage={item.stage} />
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 mt-2" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Sem seguimento */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Leads sem seguimento</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {mockNoFollowup.map((l) => (
            <li key={l.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{l.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Sem contacto há {l.days} dias</p>
              </div>
              <LeadChefLeadStageBadge stage={l.stage} />
            </li>
          ))}
        </ul>
      </section>

      {/* Progresso mensal */}
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Progresso mensal</h2>
        </div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-slate-900">{goalProgress}%</span>
          <span className="text-xs text-slate-500">8 / 13 vendas</span>
        </div>
        <Progress value={goalProgress} className="h-2" />
        <p className="text-xs text-slate-500 mt-2">
          Faltam <span className="font-semibold text-slate-900">5 vendas</span> para o objetivo do mês.
        </p>
      </section>
    </LeadChefMobileShell>
  );
}
