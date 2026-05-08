import { CalendarDays, Trophy, Users, UserPlus } from "lucide-react";
import { LeadChefGoalCard } from "./LeadChefGoalCard";
import type { LeadChefGoal } from "@/types/leadchef";
import type { LeadChefMonthlyProgressData } from "@/hooks/leadchef/useLeadChefMonthlyProgress";

interface Props {
  goals: LeadChefGoal | null;
  progress: LeadChefMonthlyProgressData;
}

export function LeadChefGoalProgress({ goals, progress }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <LeadChefGoalCard
        icon={CalendarDays}
        title="Demonstrações"
        current={progress.demosCompleted}
        goal={goals?.demos_goal ?? 0}
        description={`${progress.demosScheduled} marcadas no mês`}
      />
      <LeadChefGoalCard
        icon={Trophy}
        title="Vendas"
        current={progress.salesWon}
        goal={goals?.sales_goal ?? 0}
      />
      <LeadChefGoalCard
        icon={Users}
        title="Referências"
        current={progress.referrals}
        goal={goals?.referrals_goal ?? 0}
      />
      <LeadChefGoalCard
        icon={UserPlus}
        title="Recrutamentos"
        current={progress.recruitments}
        goal={goals?.recruitment_goal ?? 0}
      />
    </div>
  );
}
