import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadChefReferralStatusBadge } from "./LeadChefReferralStatusBadge";
import { LEADCHEF_AUTHORIZATION_STATUS_COLORS, LEADCHEF_AUTHORIZATION_STATUS_LABELS } from "./constants";
import { cn } from "@/lib/utils";
import type { LeadChefReferral } from "@/types/leadchef";

interface Props {
  referral: LeadChefReferral;
  referrerName?: string | null;
  convertedLeadId?: string | null;
}

export function LeadChefReferralDetailHeader({ referral, referrerName, convertedLeadId }: Props) {
  const navigate = useNavigate();
  return (
    <header className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <button onClick={() => navigate(-1)} className="text-xs text-slate-500 inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900">{referral.name}</h1>
      {referral.phone && <p className="text-sm text-slate-600 mt-0.5">{referral.phone}</p>}
      {referral.email && <p className="text-xs text-slate-500 mt-0.5">{referral.email}</p>}
      {referrerName && (
        <p className="text-xs text-slate-500 mt-1">Indicada por <span className="font-medium text-slate-700">{referrerName}</span></p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <LeadChefReferralStatusBadge status={referral.status} />
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
          LEADCHEF_AUTHORIZATION_STATUS_COLORS[referral.authorization_status]
        )}>
          {LEADCHEF_AUTHORIZATION_STATUS_LABELS[referral.authorization_status]}
        </span>
      </div>
      {convertedLeadId && (
        <button
          onClick={() => navigate(`/dashboard/leadchef/leads/${convertedLeadId}`)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Abrir lead convertido <ExternalLink className="h-3 w-3" />
        </button>
      )}
    </header>
  );
}
