import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Search } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefClientCard } from "@/components/leadchef/LeadChefClientCard";
import { LeadChefReferralCard } from "@/components/leadchef/LeadChefReferralCard";
import { LeadChefClientesEmptyState } from "@/components/leadchef/LeadChefClientesEmptyState";
import { LeadChefReferenciasEmptyState } from "@/components/leadchef/LeadChefReferenciasEmptyState";
import { LeadChefReferralFormSheet } from "@/components/leadchef/LeadChefReferralFormSheet";
import { LeadChefConvertReferralSheet } from "@/components/leadchef/LeadChefConvertReferralSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLeadChefClients } from "@/hooks/leadchef/useLeadChefClients";
import { useLeadChefReferrals } from "@/hooks/leadchef/useLeadChefReferrals";
import {
  LEADCHEF_CLIENT_STATUSES,
  LEADCHEF_CLIENT_STATUS_LABELS,
  LEADCHEF_REFERRAL_STATUSES,
  LEADCHEF_REFERRAL_STATUS_LABELS,
  type LeadChefClientStatus,
} from "@/components/leadchef/constants";
import type { LeadChefReferral, LeadChefReferralStatus } from "@/types/leadchef";
import { cn } from "@/lib/utils";

const CLIENT_OPTIONS: Array<{ value: LeadChefClientStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  ...LEADCHEF_CLIENT_STATUSES.map((s) => ({ value: s, label: LEADCHEF_CLIENT_STATUS_LABELS[s] })),
];
const REFERRAL_OPTIONS: Array<{ value: LeadChefReferralStatus | "all"; label: string }> = [
  { value: "all", label: "Todas" },
  ...LEADCHEF_REFERRAL_STATUSES.map((s) => ({ value: s, label: LEADCHEF_REFERRAL_STATUS_LABELS[s] })),
];

export default function LeadChefClientesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"clients" | "referrals">("clients");

  const [clientSearch, setClientSearch] = useState("");
  const [clientStatus, setClientStatus] = useState<LeadChefClientStatus | "all">("all");
  const { data: clients, isLoading: loadingClients } = useLeadChefClients({
    search: clientSearch,
    status: clientStatus,
  });

  const [refSearch, setRefSearch] = useState("");
  const [refStatus, setRefStatus] = useState<LeadChefReferralStatus | "all">("all");
  const { data: referrals, isLoading: loadingReferrals } = useLeadChefReferrals({
    search: refSearch,
    status: refStatus,
  });

  const [openCreateReferral, setOpenCreateReferral] = useState(false);
  const [convertingReferral, setConvertingReferral] = useState<LeadChefReferral | null>(null);

  return (
    <LeadChefMobileShell title="Clientes & Referências" subtitle="Pós-venda, fidelização e crescimento orgânico.">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "clients" | "referrals")} className="w-full">
        <TabsList className="grid grid-cols-2 w-full bg-white border border-slate-200">
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="referrals">Referências</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Pesquisar clientes…"
              className="pl-9 bg-white"
            />
          </div>
          <div className="-mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 pb-1 w-max">
              {CLIENT_OPTIONS.map((opt) => {
                const active = clientStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setClientStatus(opt.value)}
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

          {loadingClients ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : !clients || clients.length === 0 ? (
            <LeadChefClientesEmptyState />
          ) : (
            <ul className="space-y-2">
              {clients.map((c) => (
                <li key={c.id}>
                  <LeadChefClientCard
                    client={c}
                    onClick={() => navigate(`/dashboard/leadchef/clientes/${c.leadId}`)}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="space-y-3 mt-4">
          <Button
            onClick={() => setOpenCreateReferral(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova referência
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={refSearch}
              onChange={(e) => setRefSearch(e.target.value)}
              placeholder="Pesquisar referências…"
              className="pl-9 bg-white"
            />
          </div>
          <div className="-mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 pb-1 w-max">
              {REFERRAL_OPTIONS.map((opt) => {
                const active = refStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRefStatus(opt.value)}
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

          {loadingReferrals ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : !referrals || referrals.length === 0 ? (
            <LeadChefReferenciasEmptyState onCreate={() => setOpenCreateReferral(true)} />
          ) : (
            <ul className="space-y-2">
              {referrals.map((r) => (
                <li key={r.id}>
                  <LeadChefReferralCard
                    referral={r}
                    onClick={() => navigate(`/dashboard/leadchef/referencias/${r.id}`)}
                    onConvert={() => setConvertingReferral(r)}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <LeadChefReferralFormSheet
        open={openCreateReferral}
        onOpenChange={setOpenCreateReferral}
      />
      <LeadChefConvertReferralSheet
        open={!!convertingReferral}
        onOpenChange={(o) => !o && setConvertingReferral(null)}
        referral={convertingReferral}
        onConverted={(leadId) => {
          setConvertingReferral(null);
          navigate(`/dashboard/leadchef/leads/${leadId}`);
        }}
      />
    </LeadChefMobileShell>
  );
}
