import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Users } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefClientCard } from "@/components/leadchef/LeadChefClientCard";
import { LeadChefClientesEmptyState } from "@/components/leadchef/LeadChefClientesEmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLeadChefClients } from "@/hooks/leadchef/useLeadChefClients";
import {
  LEADCHEF_CLIENT_STATUSES,
  LEADCHEF_CLIENT_STATUS_LABELS,
  type LeadChefClientStatus,
} from "@/components/leadchef/constants";
import { cn } from "@/lib/utils";

const CLIENT_OPTIONS: Array<{ value: LeadChefClientStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  ...LEADCHEF_CLIENT_STATUSES.map((s) => ({ value: s, label: LEADCHEF_CLIENT_STATUS_LABELS[s] })),
];

export default function LeadChefClientesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadChefClientStatus | "all">("all");
  const { data, isLoading, isError } = useLeadChefClients({ search, status });

  return (
    <LeadChefMobileShell
      title="Clientes"
      subtitle="Acompanha pós-venda, referências e crescimento."
    >
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/dashboard/leadchef/referencias")}
        >
          <Users className="h-4 w-4 mr-2" />
          Ver referências
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
            {CLIENT_OPTIONS.map((opt) => {
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
          Não foi possível carregar os clientes.
        </div>
      ) : !data || data.length === 0 ? (
        <LeadChefClientesEmptyState />
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id}>
              <LeadChefClientCard
                client={c}
                onClick={() => navigate(`/dashboard/leadchef/clientes/${c.leadId}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </LeadChefMobileShell>
  );
}
