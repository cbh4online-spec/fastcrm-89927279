import { Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeadChefNextActionSuggestion } from "@/types/leadchefTemplates";

interface Props {
  suggestion: LeadChefNextActionSuggestion;
  onCreate: (s: LeadChefNextActionSuggestion) => void;
}

export function LeadChefNextActionSuggestionCard({ suggestion, onCreate }: Props) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2">
      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        <Lightbulb className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{suggestion.description}</p>
        <p className="text-[11px] text-slate-500 mt-1">{suggestion.whenLabel}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => onCreate(suggestion)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Criar
      </Button>
    </div>
  );
}
