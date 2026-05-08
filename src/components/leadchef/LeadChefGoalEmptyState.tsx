import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCreate: () => void;
  monthLabel: string;
}

export function LeadChefGoalEmptyState({ onCreate, monthLabel }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-emerald-200 p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <Target className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">Ainda não definiste objetivos</h3>
      <p className="text-sm text-slate-500 mt-1">
        Define o que queres alcançar em <span className="font-medium">{monthLabel}</span> para acompanhar o teu progresso.
      </p>
      <Button onClick={onCreate} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
        Definir objetivos
      </Button>
    </div>
  );
}
