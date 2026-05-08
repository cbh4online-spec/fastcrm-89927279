import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUpdateLeadChefClientStatus } from "@/hooks/leadchef/useUpdateLeadChefClientStatus";
import type { LeadChefClientDetail } from "@/hooks/leadchef/useLeadChefClient";

const STEPS = [
  { key: "sale", label: "Venda" },
  { key: "onboarding", label: "Onboarding" },
  { key: "post_sale", label: "Pós-venda" },
  { key: "cooking_class", label: "Aula de cozinha" },
  { key: "custom_visit", label: "Visita à medida" },
  { key: "referral_request", label: "Pedido de referência" },
  { key: "recruitment", label: "Recrutamento" },
  { key: "reactivation", label: "Reativação" },
] as const;

export function LeadChefClientCycleCard({ client }: { client: LeadChefClientDetail }) {
  const [cycle, setCycle] = useState<Record<string, boolean>>(() => ({
    sale: true, // venda já existe (cliente é won)
    ...(client.customerCycle || {}),
  }));
  const update = useUpdateLeadChefClientStatus();

  const toggle = async (key: string) => {
    const next = { ...cycle, [key]: !cycle[key] };
    setCycle(next);
    try {
      await update.mutateAsync({ leadId: client.leadId, customerCycle: next });
    } catch {
      setCycle(cycle); // revert
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Ciclo do cliente</h2>
      <ul className="grid grid-cols-2 gap-2">
        {STEPS.map((step) => {
          const done = !!cycle[step.key];
          return (
            <li key={step.key}>
              <Button
                variant="outline"
                onClick={() => toggle(step.key)}
                className={cn(
                  "w-full justify-start h-auto py-2 text-xs font-medium",
                  done ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white"
                )}
              >
                <span className={cn(
                  "h-5 w-5 rounded-full border flex items-center justify-center mr-2 shrink-0",
                  done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent"
                )}>
                  <Check className="h-3 w-3" />
                </span>
                {step.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
