import { ArrowLeft, Phone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadChefClientStatusBadge } from "./LeadChefClientStatusBadge";
import { LeadChefClientPotentialBadge } from "./LeadChefClientPotentialBadge";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { buildLeadChefMessage } from "@/utils/leadchef/messageTemplates";
import type { LeadChefClientDetail } from "@/hooks/leadchef/useLeadChefClient";

export function LeadChefClientDetailHeader({ client }: { client: LeadChefClientDetail }) {
  const navigate = useNavigate();
  return (
    <header className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <button onClick={() => navigate(-1)} className="text-xs text-slate-500 inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
      {client.phone && <p className="text-sm text-slate-600 mt-0.5">{client.phone}</p>}
      {client.email && <p className="text-xs text-slate-500 mt-0.5">{client.email}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <LeadChefClientStatusBadge status={client.status} />
        <LeadChefClientPotentialBadge potentialReferral={client.potentialReferral} potentialRecruitment={client.potentialRecruitment} />
      </div>
      {client.phone && (
        <div className="mt-3 flex gap-2">
          <a href={buildTelHref(client.phone)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Phone className="h-4 w-4" /> Ligar
          </a>
          <a href={buildWhatsAppHref(client.phone, buildLeadChefMessage("post_sale", { leadName: client.name }))}
            target="_blank" rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}
