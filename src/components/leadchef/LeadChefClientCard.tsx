import { Phone, MessageCircle, ChevronRight, Sparkles } from "lucide-react";
import { LeadChefClientStatusBadge } from "./LeadChefClientStatusBadge";
import { LeadChefClientPotentialBadge } from "./LeadChefClientPotentialBadge";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { buildLeadChefMessage } from "@/utils/leadchef/messageTemplates";
import type { LeadChefClient } from "@/hooks/leadchef/useLeadChefClients";

interface Props {
  client: LeadChefClient;
  onClick?: () => void;
  onRequestReferral?: () => void;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function LeadChefClientCard({ client, onClick, onRequestReferral }: Props) {
  const wonAt = formatDate(client.wonAt);
  const next = client.nextFollowUpAt ? new Date(client.nextFollowUpAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
      <button onClick={onClick} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{client.name}</p>
            {client.phone && <p className="text-xs text-slate-500 mt-0.5">{client.phone}</p>}
            {wonAt && <p className="text-xs text-slate-400 mt-0.5">Cliente desde {wonAt}</p>}
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <LeadChefClientStatusBadge status={client.status} />
          <LeadChefClientPotentialBadge potentialReferral={client.potentialReferral} potentialRecruitment={client.potentialRecruitment} />
        </div>
        {next && (
          <p className="text-xs text-slate-500 mt-2">
            Próxima ação · <span className="font-medium text-slate-700">{next}</span>
          </p>
        )}
      </button>
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {client.phone && (
          <>
            <a href={buildTelHref(client.phone)} onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Phone className="h-3.5 w-3.5" /> Ligar
            </a>
            <a href={buildWhatsAppHref(client.phone, buildLeadChefMessage("post_sale", { leadName: client.name }))}
              target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </>
        )}
        {onRequestReferral && (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestReferral(); }}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Sparkles className="h-3.5 w-3.5" /> Pedir referência
          </button>
        )}
      </div>
    </div>
  );
}
