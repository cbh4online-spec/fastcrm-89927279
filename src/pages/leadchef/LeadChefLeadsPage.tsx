import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Phone, MessageCircle, Plus, Search, UserRoundSearch } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefLeadStageBadge } from "@/components/leadchef/LeadChefLeadStageBadge";
import { LeadChefQuickLeadSheet } from "@/components/leadchef/LeadChefQuickLeadSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLeadChefLeads } from "@/hooks/leadchef/useLeadChefLeads";
import {
  LEADCHEF_STAGES,
  LEADCHEF_STAGE_LABELS,
} from "@/components/leadchef/constants";
import type { LeadChefStage } from "@/types/leadchef";
import { buildTelHref, buildWhatsAppHref } from "@/utils/leadchef/contact";

const TEMP_LABEL: Record<string, string> = { cold: "Frio", warm: "Morno", hot: "Quente" };
const TEMP_COLOR: Record<string, string> = {
  cold: "text-sky-600",
  warm: "text-amber-600",
  hot: "text-rose-600",
};

export default function LeadChefLeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<LeadChefStage | "all">("all");
  const [openSheet, setOpenSheet] = useState(false);

  const { data, isLoading } = useLeadChefLeads({ search, stage });

  return (
    <LeadChefMobileShell title="Leads" subtitle="Funil simples dos leads LeadChef.">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nome, telefone, email…"
            className="pl-9 bg-white"
          />
        </div>
        <Select value={stage} onValueChange={(v) => setStage(v as LeadChefStage | "all")}>
          <SelectTrigger className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {LEADCHEF_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{LEADCHEF_STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={() => setOpenSheet(true)}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Novo lead
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <UserRoundSearch className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600">
            {search || stage !== "all"
              ? "Sem leads com estes filtros."
              : "Ainda não tens leads LeadChef. Cria o primeiro com o botão acima."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map(({ profile, lead }) => {
            const next = profile.next_action_at
              ? new Date(profile.next_action_at).toLocaleString("pt-PT", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })
              : null;
            return (
              <li
                key={profile.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
                onClick={() => navigate(`/dashboard/leadchef/leads/${lead.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {[profile.origin, profile.interest].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <LeadChefLeadStageBadge stage={profile.stage} />
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs">
                  {lead.phone && (
                    <span className="text-slate-600 truncate">{lead.phone}</span>
                  )}
                  <span className={`font-medium ${TEMP_COLOR[profile.temperature]}`}>
                    {TEMP_LABEL[profile.temperature]}
                  </span>
                </div>

                {next && (
                  <p className="text-xs text-slate-500 mt-2">
                    Próxima ação: <span className="font-medium text-slate-700">{next}</span>
                  </p>
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
                      target="_blank" rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <LeadChefQuickLeadSheet open={openSheet} onOpenChange={setOpenSheet} />
    </LeadChefMobileShell>
  );
}
