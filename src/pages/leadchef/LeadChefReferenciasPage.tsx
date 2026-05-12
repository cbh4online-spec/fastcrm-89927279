import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Search } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefReferralCard } from "@/components/leadchef/LeadChefReferralCard";
import { LeadChefReferenciasEmptyState } from "@/components/leadchef/LeadChefReferenciasEmptyState";
import { LeadChefReferralFormSheet } from "@/components/leadchef/LeadChefReferralFormSheet";
import { LeadChefConvertReferralSheet } from "@/components/leadchef/LeadChefConvertReferralSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLeadChefReferrals } from "@/hooks/leadchef/useLeadChefReferrals";
import {
  LEADCHEF_REFERRAL_STATUSES,
  LEADCHEF_REFERRAL_STATUS_LABELS,
} from "@/components/leadchef/constants";
import type { LeadChefReferral, LeadChefReferralStatus } from "@/types/leadchef";
import { cn } from "@/lib/utils";

const REFERRAL_OPTIONS: Array<{ value: LeadChefReferralStatus | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  ...LEADCHEF_REFERRAL_STATUSES.map((s) => ({ value: s, label: LEADCHEF_REFERRAL_STATUS_LABELS[s] })),
];

export default function LeadChefReferenciasPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadChefReferralStatus | "all">("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [converting, setConverting] = useState<LeadChefReferral | null>(null);

  const { data, isLoading, isError } = useLeadChefReferrals({ search, status });

  return (
    <LeadChefMobileShell
      title="Referências"
      subtitle="Acompanha pessoas indicadas e transforma referências em novos leads."
    >
      <div className="space-y-3">
        <Button
          onClick={() => setOpenCreate(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova referência
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
            {REFERRAL_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
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
      ) : isError ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-600">
          Não foi possível carregar as referências.
        </div>
      ) : !data || data.length === 0 ? (
        <LeadChefReferenciasEmptyState onCreate={() => setOpenCreate(true)} />
      ) : (
        <ul className="space-y-2">
          {data.map((r) => (
            <li key={r.id}>
              <LeadChefReferralCard
                referral={r}
                referrerName={(r as any).referred_by_lead_name ?? null}
                onClick={() => navigate(`/dashboard/leadchef/referencias/${r.id}`)}
                onConvert={() => setConverting(r)}
              />
            </li>
          ))}
        </ul>
      )}

      <LeadChefReferralFormSheet open={openCreate} onOpenChange={setOpenCreate} />
      <LeadChefConvertReferralSheet
        open={!!converting}
        onOpenChange={(o) => !o && setConverting(null)}
        referral={converting}
        onConverted={(leadId) => {
          setConverting(null);
          navigate(`/dashboard/leadchef/leads/${leadId}`);
        }}
      />
    </LeadChefMobileShell>
  );
}
