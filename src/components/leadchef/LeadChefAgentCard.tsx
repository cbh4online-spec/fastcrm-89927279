import { ChevronRight } from "lucide-react";
import { LeadChefRoleBadge } from "./LeadChefRoleBadge";
import type { LeadChefAgentSummary } from "@/hooks/leadchef/useLeadChefTeamOverview";

interface Props {
  summary: LeadChefAgentSummary;
  onClick?: () => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function LeadChefAgentCard({ summary, onClick }: Props) {
  const { member } = summary;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-white border border-slate-200 shadow-sm p-4 hover:border-emerald-300 transition"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-sm">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover rounded-full" />
          ) : (
            initials(member.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
          <div className="mt-1"><LeadChefRoleBadge role={member.role} /></div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Leads</dt>
          <dd className="text-base font-semibold text-slate-900">{summary.activeLeads}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Demos</dt>
          <dd className="text-base font-semibold text-slate-900">{summary.demosCompleted}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Vendas</dt>
          <dd className="text-base font-semibold text-emerald-700">{summary.salesWon}</dd>
        </div>
      </dl>

      {(summary.overdueActions > 0 || summary.referrals > 0) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {summary.overdueActions > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {summary.overdueActions} em atraso
            </span>
          )}
          {summary.referrals > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              {summary.referrals} referências
            </span>
          )}
        </div>
      )}
    </button>
  );
}
