import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthPt, shiftMonth, startOfMonthIso } from "@/utils/leadchef/goals";

interface Props {
  value: string; // YYYY-MM-DD (dia 1)
  onChange: (next: string) => void;
}

export function LeadChefMonthSelector({ value, onChange }: Props) {
  const isCurrent = value === startOfMonthIso();
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        type="button"
        onClick={() => onChange(startOfMonthIso())}
        className="px-3 py-1.5 text-sm font-medium text-slate-900 min-w-[120px]"
        title={isCurrent ? "Mês atual" : "Voltar ao mês atual"}
      >
        {formatMonthPt(value)}
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
