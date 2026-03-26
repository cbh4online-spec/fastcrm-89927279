import { AIQuestionBox } from "@/components/command-center/AIQuestionBox";
import { Bot, Sparkles } from "lucide-react";

const SUGGESTION_CHIPS = [
  "Como aumentar vendas?",
  "Deals prioritários",
  "Analisar pipeline",
  "Diagnóstico de leads",
];

export function PremiumAISection() {
  const handleChipClick = (chip: string) => {
    // Dispatch a custom event that AIQuestionBox's CommandInput listens to
    window.dispatchEvent(new CustomEvent("ai-suggestion-click", { detail: chip }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 text-primary">
          <Bot className="h-4 w-4" />
          <span className="text-xs font-semibold tracking-wide uppercase">Assistente de Vendas IA</span>
        </div>
        <Sparkles className="h-3 w-3 text-primary/50" />
      </div>
      <AIQuestionBox />
      <div className="flex flex-wrap gap-1.5 px-1">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleChipClick(chip)}
            className="text-[11px] px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
