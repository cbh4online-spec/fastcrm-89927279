import { useState, useRef, KeyboardEvent } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandHeroProps {
  onSubmit: (command: string) => void;
  isLoading: boolean;
  onCommandSelect: (command: string) => void;
}

const COMMANDS = [
  { key: "prepare-meeting", label: "Preparar Reunião", emoji: "📅", desc: "Briefing completo para reuniões" },
  { key: "analyze-company", label: "Analisar Empresa", emoji: "🏢", desc: "Perfil, ICP e potencial" },
  { key: "analyze-deal", label: "Analisar Deal", emoji: "📊", desc: "Saúde e sinais de risco" },
  { key: "win-deal", label: "Ganhar Deal", emoji: "🏆", desc: "Estratégia de fecho" },
  { key: "send-followup", label: "Follow-up", emoji: "✉️", desc: "Draft de seguimento" },
  { key: "generate-proposal", label: "Gerar Proposta", emoji: "📝", desc: "Estrutura de proposta" },
  { key: "pipeline-status", label: "Pipeline Status", emoji: "🔄", desc: "Saúde do pipeline" },
];

export function CommandHero({ onSubmit, isLoading, onCommandSelect }: CommandHeroProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-violet-500/40 to-primary/40 rounded-xl blur-sm opacity-50 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center gap-3 bg-background border border-border/50 rounded-xl px-4 py-3 shadow-lg">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Prepara-me para a reunião com a empresa X..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2 rounded-lg transition-all shrink-0",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Command Chips */}
      <div className="flex flex-wrap gap-2">
        {COMMANDS.map((cmd) => (
          <button
            key={cmd.key}
            onClick={() => onCommandSelect(cmd.key === "pipeline-status" ? "Mostra o status do pipeline" : `${cmd.label}`)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 hover:border-border transition-all disabled:opacity-50"
          >
            <span>{cmd.emoji}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
