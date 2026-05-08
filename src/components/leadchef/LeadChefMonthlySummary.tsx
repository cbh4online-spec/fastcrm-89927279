import { Sparkles, Phone, CalendarDays, Trophy, Users, UserPlus } from "lucide-react";
import { LeadChefDashboardMetricCard } from "./LeadChefDashboardMetricCard";
import type { LeadChefGoal } from "@/types/leadchef";
import type { LeadChefMonthlyProgressData } from "@/hooks/leadchef/useLeadChefMonthlyProgress";

interface Props {
  goals: LeadChefGoal | null;
  progress: LeadChefMonthlyProgressData;
}

export function LeadChefMonthlySummary({ goals, progress }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <LeadChefDashboardMetricCard icon={Sparkles} label="Leads novos" current={progress.leadsCreated} goal={goals?.leads_goal ?? 0} />
      <LeadChefDashboardMetricCard icon={Phone} label="Contactos" current={progress.contactsMade} goal={goals?.contacts_goal ?? 0} />
      <LeadChefDashboardMetricCard icon={CalendarDays} label="Demonstrações" current={progress.demosCompleted} goal={goals?.demos_goal ?? 0} hint={`${progress.demosScheduled} marcadas`} />
      <LeadChefDashboardMetricCard icon={Trophy} label="Vendas" current={progress.salesWon} goal={goals?.sales_goal ?? 0} />
      <LeadChefDashboardMetricCard icon={Users} label="Referências" current={progress.referrals} goal={goals?.referrals_goal ?? 0} />
      <LeadChefDashboardMetricCard icon={UserPlus} label="Recrutamentos" current={progress.recruitments} goal={goals?.recruitment_goal ?? 0} />
    </div>
  );
}
