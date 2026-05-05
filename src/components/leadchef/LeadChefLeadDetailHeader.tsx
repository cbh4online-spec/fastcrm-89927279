import { ArrowLeft, Phone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadChefLeadStageBadge } from "./LeadChefLeadStageBadge";
import { LeadChefLeadTemperatureBadge } from "./LeadChefLeadTemperatureBadge";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { buildLeadChefMessage } from "@/utils/leadchef/messageTemplates";
import type { LeadChefLeadWithProfile } from "@/types/leadchef";

interface Props {
  data: LeadChefLeadWithProfile;
}

export function LeadChefLeadDetailHeader({ data }: Props) {
  const navigate = useNavigate();
  const { lead, profile } = data;
  const phone = lead.phone || "";

  const waMessage = buildLeadChefMessage("first_contact", {
    leadName: lead.name,
  });

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
      </button>

      <h1 className="text-lg font-semibold text-slate-900">{lead.name}</h1>
      <p className="text-xs text-slate-500 mt-0.5">
        {[profile.origin, profile.interest].filter(Boolean).join(" · ") || "—"}
      </p>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <LeadChefLeadStageBadge stage={profile.stage} />
        <LeadChefLeadTemperatureBadge temperature={profile.temperature} />
      </div>

      {phone && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <a
            href={buildTelHref(phone)}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-50"
          >
            <Phone className="h-4 w-4" /> Ligar
          </a>
          <a
            href={buildWhatsAppHref(phone, waMessage)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
