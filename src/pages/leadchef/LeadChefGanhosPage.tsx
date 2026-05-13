import { Skeleton } from "@/components/ui/skeleton";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { useAgentCommission } from "@/hooks/leadchef/useAgentCommission";
import { GanhosKpis } from "@/components/leadchef/ganhos/GanhosKpis";
import { GanhosSimulator } from "@/components/leadchef/ganhos/GanhosSimulator";
import { ComissoesTable } from "@/components/leadchef/ganhos/ComissoesTable";
import { ExtrasCard } from "@/components/leadchef/ganhos/ExtrasCard";

export default function LeadChefGanhosPage() {
  const c = useAgentCommission();

  return (
    <LeadChefMobileShell
      title="Os meus ganhos"
      subtitle="Tudo calculado automaticamente a partir das tuas vendas, visitas e recrutamentos do mês."
      showFab={false}
    >
      {c.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <GanhosKpis
            sales={c.sales}
            base={c.base}
            bonus={c.bonus}
            total={c.total}
            currentTier={c.currentTier}
            nextTier={c.nextTier}
            salesToNextTier={c.salesToNextTier}
            extraToNextTier={c.extraToNextTier}
          />
          <GanhosSimulator currentSales={c.sales} />
          <ComissoesTable highlightSales={c.currentTier} />
          <ExtrasCard
            postSaleVisits={c.postSaleVisits}
            visitsTotal={c.visitsTotal}
            recruitmentEntries={c.recruitmentEntries}
            recruitmentTotal={c.recruitmentTotal}
            secondSaleBonus={c.secondSaleBonus}
            extrasTotal={c.extrasTotal}
          />
        </>
      )}
    </LeadChefMobileShell>
  );
}
