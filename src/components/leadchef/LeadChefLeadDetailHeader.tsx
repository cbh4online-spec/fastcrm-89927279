import { ArrowLeft, Phone, MessageCircle, MapPin, Navigation, Map as MapIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadChefLeadStageBadge } from "./LeadChefLeadStageBadge";
import { LeadChefLeadTemperatureBadge } from "./LeadChefLeadTemperatureBadge";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { buildLeadChefMessage } from "@/utils/leadchef/messageTemplates";
import {
  composeAddress,
  buildGoogleMapsUrl,
  buildWazeUrl,
  buildAppleMapsUrl,
} from "@/utils/leadchef/maps";
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

  const fullAddress = composeAddress({
    address: lead.address,
    city: lead.city,
    postalCode: lead.postal_code,
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

      {fullAddress ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-700 leading-snug">{fullAddress}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <a
              href={buildGoogleMapsUrl(fullAddress)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
            >
              <MapIcon className="h-3.5 w-3.5" /> Google
            </a>
            <a
              href={buildWazeUrl(fullAddress)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
            >
              <Navigation className="h-3.5 w-3.5" /> Waze
            </a>
            <a
              href={buildAppleMapsUrl(fullAddress)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
            >
              <MapIcon className="h-3.5 w-3.5" /> Apple
            </a>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-slate-400 inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Sem morada registada.
        </p>
      )}
    </div>
  );
}
