import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DollarSign, Flame, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  revenueToday: number | null;
  hotLeadsCount: number;
  pendingDecisions: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getMotivationalMessage(dayOfWeek: number, pendingDecisions: number, pipelineRisk: number) {
  // Context-aware messages first
  if (pendingDecisions > 0) {
    return `O sistema identificou ${pendingDecisions} situação${pendingDecisions > 1 ? "ões que precisam" : " que precisa"} de ti hoje.`;
  }

  // Day-of-week messages
  const dayMessages: Record<number, string> = {
    0: "Domingo de planeamento. Prepara a semana que vem.",
    1: "Nova semana, nova oportunidade de fechar o que ficou pendente.",
    2: "Os negócios que vais ganhar esta semana já estão no teu pipeline. Vai buscá-los.",
    3: "Os negócios que vais ganhar esta semana já estão no teu pipeline. Vai buscá-los.",
    4: "Os negócios que vais ganhar esta semana já estão no teu pipeline. Vai buscá-los.",
    5: "Fecha a semana forte. Uma decisão hoje vale duas na segunda.",
    6: "O negócio está saudável. Foca no que vai fazer crescer.",
  };

  return dayMessages[dayOfWeek] || "O negócio está saudável. Foca no que vai fazer crescer.";
}

function getFirstName(user: any): string | null {
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    null;
  if (!fullName) return null;
  return fullName.split(" ")[0];
}

export function CommandCenterHeader({ revenueToday, hotLeadsCount, pendingDecisions }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();
  const todayFormatted = format(today, "EEEE, d 'de' MMMM", { locale: pt });
  const firstName = getFirstName(user);
  const motivational = getMotivationalMessage(today.getDay(), pendingDecisions, 0);

  const chips = [
    {
      label: "Revenue",
      value: revenueToday != null && revenueToday > 0 ? `€${revenueToday.toLocaleString("pt-PT")}` : "€—",
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      tooltip: "Receita hoje — propostas aceites e faturas pagas",
      onClick: () => navigate("/dashboard/revenue"),
    },
    {
      label: "Hot Leads",
      value: hotLeadsCount > 0 ? hotLeadsCount.toString() : "—",
      icon: Flame,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      tooltip: "Leads quentes — score ≥ 70 sem contacto há +2 dias",
      onClick: () => navigate("/dashboard/leads"),
    },
    {
      label: "Decisões",
      value: pendingDecisions > 0 ? pendingDecisions.toString() : "—",
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      tooltip: "Decisões pendentes do Kernel",
      onClick: () => navigate("/dashboard/strategy"),
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}. 👋
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayFormatted}</p>
          <p className="text-xs text-muted-foreground/80 italic mt-1 max-w-md">{motivational}</p>
        </div>
        <div className="flex items-center gap-2">
          {chips.map((chip) => (
            <Tooltip key={chip.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={chip.onClick}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    chip.bg, chip.color,
                    "hover:opacity-80 cursor-pointer border border-transparent hover:border-border/50"
                  )}
                >
                  <chip.icon className="h-3.5 w-3.5" />
                  <span>{chip.value}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {chip.tooltip}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
