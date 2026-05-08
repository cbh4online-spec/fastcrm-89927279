import { Loader2 } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefAutomationCard } from "@/components/leadchef/LeadChefAutomationCard";
import { LeadChefAutomationsEmptyState } from "@/components/leadchef/LeadChefAutomationsEmptyState";
import {
  useLeadChefAutomations,
  useUpdateLeadChefAutomation,
} from "@/hooks/leadchef/useLeadChefAutomations";

export default function LeadChefAutomacoesPage() {
  const { data, isLoading, isError } = useLeadChefAutomations();
  const update = useUpdateLeadChefAutomation();

  return (
    <LeadChefMobileShell
      title="Automações"
      subtitle="Regras leves para te avisar e sugerir próximas ações."
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-600">
          Não foi possível carregar as automações.
        </div>
      ) : !data || data.rules.length === 0 ? (
        <LeadChefAutomationsEmptyState />
      ) : (
        <div className="space-y-3">
          {data.rules.map((r) => (
            <LeadChefAutomationCard
              key={r.key}
              rule={r}
              isPending={update.isPending}
              onToggle={(enabled) =>
                update.mutate({
                  key: r.key,
                  name: r.name,
                  description: r.description ?? null,
                  trigger_type: r.trigger_type,
                  action_type: r.action_type,
                  config: (r.config as Record<string, unknown>) ?? {},
                  is_enabled: enabled,
                })
              }
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 text-center pt-4">
        As automações criam alertas e sugestões. Não enviam mensagens automaticamente.
      </p>
    </LeadChefMobileShell>
  );
}
