import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DollarSign, Flame, AlertCircle, Settings, ArrowLeftRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function getFirstName(user: any): string | null {
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (!fullName) return null;
  return fullName.split(" ")[0];
}

function getQuarterContext() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);
  
  const dayOfYear = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000);
  const startDay = dayOfYear(quarterStart);
  const currentDay = dayOfYear(now);
  const endDay = dayOfYear(quarterEnd);
  
  const totalWeeks = Math.ceil((endDay - startDay + 1) / 7);
  const currentWeek = Math.min(Math.ceil((currentDay - startDay + 1) / 7), totalWeeks);
  
  return { quarter, year, currentWeek, totalWeeks };
}

export function PremiumDashboardHeader({ revenueToday, hotLeadsCount, pendingDecisions }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();
  const todayFormatted = format(today, "EEEE, d 'de' MMMM", { locale: pt });
  const firstName = getFirstName(user);
  const { quarter, year, currentWeek, totalWeeks } = getQuarterContext();

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
        className="space-y-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Top row: greeting + chips */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Dashboard de Vendas
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {getGreeting()}{firstName ? `, ${firstName}` : ""} · <span className="capitalize">{todayFormatted}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-border/60">
                Q{quarter} {year} · Semana {currentWeek} de {totalWeeks}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 gap-1">
                <ArrowLeftRight className="h-2.5 w-2.5" />
                Semana vs semana
              </Badge>
            </div>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Configurações
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
