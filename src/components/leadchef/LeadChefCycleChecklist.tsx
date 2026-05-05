import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUpdateLeadChefCycle,
  type LeadChefCycle,
  type LeadChefCycleKey,
} from "@/hooks/leadchef/useUpdateLeadChefCycle";

interface Props {
  profileId: string;
  cycle: LeadChefCycle | Record<string, unknown>;
}

const ITEMS: { key: LeadChefCycleKey; label: string }[] = [
  { key: "demo", label: "Demonstração" },
  { key: "post_sale_visit", label: "Pós-venda" },
  { key: "cooking_class", label: "Aula de cozinha" },
  { key: "custom_visit", label: "Visita à medida" },
  { key: "proposal", label: "Proposta" },
  { key: "sale", label: "Venda" },
  { key: "referrals", label: "Referências" },
  { key: "recruitment", label: "Recrutamento" },
];

export function LeadChefCycleChecklist({ profileId, cycle }: Props) {
  const update = useUpdateLeadChefCycle();
  const safeCycle = (cycle ?? {}) as LeadChefCycle;

  const toggle = (key: LeadChefCycleKey) => {
    const cur = safeCycle[key]?.done ?? false;
    const next: LeadChefCycle = {
      ...safeCycle,
      [key]: {
        done: !cur,
        date: !cur ? new Date().toISOString() : null,
      },
    };
    update.mutate({ profileId, cycle: next });
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Ciclo do cliente</h2>
      <ul className="grid grid-cols-2 gap-2">
        {ITEMS.map((it) => {
          const done = safeCycle[it.key]?.done ?? false;
          return (
            <li key={it.key}>
              <button
                onClick={() => toggle(it.key)}
                disabled={update.isPending}
                className={cn(
                  "w-full flex items-center gap-2 text-left text-xs font-medium rounded-xl px-3 py-2 border transition",
                  done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                  update.isPending && "opacity-60 cursor-not-allowed"
                )}
              >
                {done ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400" />
                )}
                <span className="truncate">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
