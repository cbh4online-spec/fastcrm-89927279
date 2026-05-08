import { Phone, MessageCircle, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadChefLeadStageBadge } from "./LeadChefLeadStageBadge";
import { LeadChefLeadTemperatureBadge } from "./LeadChefLeadTemperatureBadge";
import { LeadChefLeadScoreBadge } from "./LeadChefLeadScoreBadge";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import type { LeadChefLeadWithProfile } from "@/types/leadchef";

interface Props {
  item: LeadChefLeadWithProfile;
  onClick?: () => void;
  score?: number | null;
  isCold?: boolean;
  suggestionAction?: string | null;
  suggestionUrgency?: "low" | "medium" | "high" | null;
}

function formatNext(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export function LeadChefLeadCard({
  item,
  onClick,
  score = null,
  isCold = false,
  suggestionAction = null,
  suggestionUrgency = null,
}: Props) {
  const { profile, lead } = item;
  const overdue = isOverdue(profile.next_action_at);
  const next = formatNext(profile.next_action_at);

  const urgencyClass =
    suggestionUrgency === "high"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : suggestionUrgency === "medium"
      ? "bg-amber-50 text-amber-800 border-amber-100"
      : "bg-violet-50 text-violet-700 border-violet-100";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl bg-white border p-4 shadow-sm cursor-pointer active:bg-slate-50 transition",
        overdue ? "border-rose-200 ring-1 ring-rose-100" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {[profile.origin, profile.interest].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <LeadChefLeadScoreBadge score={score} isCold={isCold} />
            <LeadChefLeadStageBadge stage={profile.stage} />
          </div>
          <LeadChefLeadTemperatureBadge temperature={profile.temperature} />
        </div>
      </div>

      {lead.phone && (
        <p className="mt-2 text-xs text-slate-600 truncate">{lead.phone}</p>
      )}

      {next && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
            overdue
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-50 text-slate-700"
          )}
        >
          <Clock className="h-3 w-3" />
          <span>
            {profile.next_action_type
              ? LEADCHEF_ACTIVITY_LABELS[profile.next_action_type]
              : "Próxima ação"}
            {" · "}
            {next}
          </span>
        </div>
      )}

      {suggestionAction && (
        <div
          className={cn(
            "mt-2 flex items-start gap-1.5 text-xs px-2 py-1.5 rounded-md border",
            urgencyClass
          )}
          title="Próxima ação sugerida pela IA"
        >
          <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{suggestionAction}</span>
        </div>
      )}

      {lead.phone && (
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          <a
            href={buildTelHref(lead.phone)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Phone className="h-3.5 w-3.5" /> Ligar
          </a>
          <a
            href={buildWhatsAppHref(lead.phone)}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
