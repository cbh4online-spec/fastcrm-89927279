import { Phone, MessageCircle, ChevronRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadChefReferralStatusBadge } from "./LeadChefReferralStatusBadge";
import { LEADCHEF_AUTHORIZATION_STATUS_COLORS, LEADCHEF_AUTHORIZATION_STATUS_LABELS } from "./constants";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { buildLeadChefMessage } from "@/utils/leadchef/messageTemplates";
import type { LeadChefReferral } from "@/types/leadchef";

interface Props {
  referral: LeadChefReferral;
  referrerName?: string | null;
  onClick?: () => void;
  onConvert?: () => void;
}

export function LeadChefReferralCard({ referral, referrerName, onClick, onConvert }: Props) {
  const canContact = referral.authorization_status === "granted" && !!referral.phone;
  const created = new Date(referral.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
      <button onClick={onClick} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{referral.name}</p>
            {referral.phone && <p className="text-xs text-slate-500 mt-0.5">{referral.phone}</p>}
            {referrerName && (
              <p className="text-xs text-slate-500 mt-0.5">Indicada por <span className="font-medium text-slate-700">{referrerName}</span></p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <LeadChefReferralStatusBadge status={referral.status} />
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            LEADCHEF_AUTHORIZATION_STATUS_COLORS[referral.authorization_status]
          )}>
            <ShieldAlert className="h-3 w-3" />
            {LEADCHEF_AUTHORIZATION_STATUS_LABELS[referral.authorization_status]}
          </span>
          <span className="ml-auto text-[11px] text-slate-400">{created}</span>
        </div>
        {referral.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{referral.notes}</p>}
      </button>

      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {canContact && (
          <>
            <a
              href={buildTelHref(referral.phone!)}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <Phone className="h-3.5 w-3.5" /> Ligar
            </a>
            <a
              href={buildWhatsAppHref(referral.phone!, buildLeadChefMessage("referral_first_contact", { leadName: referral.name }))}
              target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </>
        )}
        {referral.status !== "converted" && onConvert && (
          <button
            onClick={(e) => { e.stopPropagation(); onConvert(); }}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Converter em referência
          </button>
        )}
      </div>
    </div>
  );
}
