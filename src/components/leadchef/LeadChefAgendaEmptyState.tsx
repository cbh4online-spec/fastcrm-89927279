import { CalendarPlus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeadChefAgendaEmptyState({
  message,
  onCreate,
}: {
  message: string;
  onCreate?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
      <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
        <CalendarDays className="h-6 w-6" />
      </div>
      <p className="text-sm text-slate-600 mb-4">{message}</p>
      {onCreate && (
        <Button onClick={onCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <CalendarPlus className="h-4 w-4 mr-2" />
          Marcar compromisso
        </Button>
      )}
    </div>
  );
}
