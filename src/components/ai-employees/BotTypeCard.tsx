import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BotType } from "@/hooks/useBots";
import { Bot, Wand2, GitBranch, Check } from "lucide-react";

const BOT_TYPES: Array<{
  type: BotType;
  label: string;
  subtitle: string;
  description: string;
  icon: typeof Bot;
  color: string;
  badge: string;
  features: string[];
}> = [
  {
    type: "guided",
    label: "Guided Setup",
    subtitle: "Configuração guiada",
    description: "Wizard passo-a-passo para configurar o comportamento do AI Employee com opções pré-definidas.",
    icon: Wand2,
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/60",
    badge: "Recomendado",
    features: ["Setup em 5 minutos", "Sem conhecimento técnico", "Ideal para começar"],
  },
  {
    type: "prompt",
    label: "Prompt Based",
    subtitle: "Baseado em prompt",
    description: "Define o comportamento através de um prompt de sistema personalizado com total controlo da persona.",
    icon: Bot,
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-400/60",
    badge: "Flexível",
    features: ["Controlo total do comportamento", "Integração com Personas IA", "Knowledge Base RAG"],
  },
  {
    type: "flow",
    label: "Flow Builder",
    subtitle: "Construtor de fluxos",
    description: "Designer visual drag-and-drop para criar fluxos conversacionais complexos com lógica condicional.",
    icon: GitBranch,
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-400/60",
    badge: "Avançado",
    features: ["Visual drag-and-drop", "Lógica condicional", "Coleta de variáveis"],
  },
];

interface BotTypeCardProps {
  selected: BotType | null;
  onSelect: (type: BotType) => void;
}

export function BotTypeCard({ selected, onSelect }: BotTypeCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {BOT_TYPES.map(({ type, label, subtitle, description, icon: Icon, color, badge, features }) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              "relative text-left rounded-xl border bg-gradient-to-br p-5 transition-all duration-200 focus:outline-none",
              color,
              isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20"
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <Badge variant="outline" className="mb-3 text-[10px] px-2 py-0.5">
              {badge}
            </Badge>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>
            <ul className="space-y-1">
              {features.map(f => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <div className="w-1 h-1 rounded-full bg-primary/60" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
