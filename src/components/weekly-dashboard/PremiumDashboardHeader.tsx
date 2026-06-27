import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const fullName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (!fullName) return null;
  return fullName.split(" ")[0];
}

function getQuarterContext() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();

  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0);

  const dayOfYear = (d: Date) =>
    Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000,
    );
  const startDay = dayOfYear(quarterStart);
  const currentDay = dayOfYear(now);
  const endDay = dayOfYear(quarterEnd);

  const totalWeeks = Math.ceil((endDay - startDay + 1) / 7);
  const currentWeek = Math.min(
    Math.ceil((currentDay - startDay + 1) / 7),
    totalWeeks,
  );

  return { quarter, year, currentWeek, totalWeeks };
}

function formatChipValue(value: number | null) {
  if (value == null || value === 0) return "—";
  return value.toLocaleString("pt-PT");
}

function formatCurrency(value: number | null) {
  if (value == null || value === 0) return "—";
  return `€${value.toLocaleString("pt-PT")}`;
}

export function PremiumDashboardHeader({
  revenueToday,
  hotLeadsCount,
  pendingDecisions,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date();
  const todayFormatted = format(today, "EEEE, d 'de' MMMM", { locale: pt });
  const firstName = getFirstName(user);
  const { quarter, year, currentWeek, totalWeeks } = getQuarterContext();

  const chips = [
    {
      label: "Revenue hoje",
      value: formatCurrency(revenueToday),
      tooltip: "Receita hoje — propostas aceites e faturas pagas",
      onClick: () => navigate("/dashboard/revenue"),
    },
    {
      label: "Hot leads",
      value: formatChipValue(hotLeadsCount),
      tooltip: "Leads quentes — score ≥ 70 sem contacto há +2 dias",
      onClick: () => navigate("/dashboard/leads"),
    },
    {
      label: "Decisões",
      value: formatChipValue(pendingDecisions),
      tooltip: "Decisões pendentes do Kernel",
      onClick: () => navigate("/dashboard/strategy"),
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard de Vendas
          </h1>
          <p className="text-sm text-muted-foreground">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""} ·{" "}
            <span className="capitalize">{todayFormatted}</span> · Q{quarter}{" "}
            {year} · Semana {currentWeek}/{totalWeeks}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Tooltip key={chip.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={chip.onClick}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <span className="text-muted-foreground">{chip.label}</span>
                  <span className="font-medium tabular-nums">{chip.value}</span>
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
    </TooltipProvider>
  );
}
