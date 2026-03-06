import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DollarSign, Flame, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

export function CommandCenterHeader({ revenueToday, hotLeadsCount, pendingDecisions }: Props) {
  const navigate = useNavigate();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });

  const chips = [
    {
      label: "Revenue",
      value: revenueToday != null ? `€${revenueToday.toLocaleString("pt-PT")}` : "—",
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      onClick: () => navigate("/dashboard/revenue"),
    },
    {
      label: "Hot Leads",
      value: hotLeadsCount.toString(),
      icon: Flame,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      onClick: () => navigate("/dashboard/leads"),
    },
    {
      label: "Decisões",
      value: pendingDecisions.toString(),
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      onClick: () => navigate("/dashboard/strategy"),
    },
  ];

  return (
    <motion.div
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">{getGreeting()} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize mt-0.5">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.label}
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
        ))}
      </div>
    </motion.div>
  );
}
