import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Search, UserRoundSearch } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefLeadCard } from "@/components/leadchef/LeadChefLeadCard";
import { LeadChefQuickLeadSheet } from "@/components/leadchef/LeadChefQuickLeadSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLeadChefLeads } from "@/hooks/leadchef/useLeadChefLeads";
import { useLeadChefLeadsBulkInsight, pickInsight } from "@/hooks/leadchef/useLeadChefLeadsBulkInsight";
import { useMemo } from "react";
import {
  LEADCHEF_STAGES,
  LEADCHEF_STAGE_LABELS,
} from "@/components/leadchef/constants";
import type { LeadChefStage } from "@/types/leadchef";
import { cn } from "@/lib/utils";

const STAGE_OPTIONS: Array<{ value: LeadChefStage | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  ...LEADCHEF_STAGES.map((s) => ({ value: s, label: LEADCHEF_STAGE_LABELS[s] })),
];

export default function LeadChefLeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<LeadChefStage | "all">("all");
  const [openSheet, setOpenSheet] = useState(false);

  const { data, isLoading } = useLeadChefLeads({ search, stage });
  const leadIds = useMemo(() => (data ?? []).map((d) => d.lead.id), [data]);
  const { data: insightMap } = useLeadChefLeadsBulkInsight(leadIds);

  return (
    <LeadChefMobileShell title="Referências" subtitle="Funil das tuas referências LeadChef.">
      <div className="space-y-3">
        <Button
          onClick={() => setOpenSheet(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo lead
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nome, telefone, email…"
            className="pl-9 bg-white"
          />
        </div>

        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1 w-max">
            {STAGE_OPTIONS.map((opt) => {
              const active = stage === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStage(opt.value)}
                  className={cn(
                    "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition",
                    active
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
          {data.map((item) => {
            const insight = pickInsight(insightMap, item.lead.id);
            return (
              <li key={item.profile.id}>
                <LeadChefLeadCard
                  item={item}
                  score={insight.score}
                  isCold={insight.isCold}
                  suggestionAction={insight.suggestionAction}
                  suggestionUrgency={insight.suggestionUrgency}
                  onClick={() =>
                    navigate(`/dashboard/leadchef/leads/${item.lead.id}`)
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      <LeadChefQuickLeadSheet open={openSheet} onOpenChange={setOpenSheet} />
    </LeadChefMobileShell>
  );
}
