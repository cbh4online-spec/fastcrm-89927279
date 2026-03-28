import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays, startOfWeek, endOfWeek, format, isWithinInterval, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { RENEWAL_STATUS_CONFIG, getHealthScoreColor } from "@/types/renewal";
import type { RenewalContract } from "@/types/renewal";

interface RenewalsCalendarViewProps {
  contracts: RenewalContract[];
  formatCurrency: (val: number) => string;
}

export function RenewalsCalendarView({ contracts, formatCurrency }: RenewalsCalendarViewProps) {
  const navigate = useNavigate();

  const weeks = useMemo(() => {
    const now = new Date();
    const result: { start: Date; end: Date; label: string; items: RenewalContract[] }[] = [];

    // Overdue bucket
    const overdue = contracts.filter(
      (c) => c.next_renewal_date && isBefore(new Date(c.next_renewal_date), now) && c.status === "active"
    );
    if (overdue.length > 0) {
      result.push({ start: new Date(0), end: now, label: "⚠️ Em Atraso", items: overdue });
    }

    // Next 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekStart = startOfWeek(addDays(now, i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addDays(now, i * 7), { weekStartsOn: 1 });
      const items = contracts.filter((c) => {
        if (!c.next_renewal_date || c.status !== "active") return false;
        const d = new Date(c.next_renewal_date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd }) && !isBefore(d, now);
      });
      if (items.length > 0) {
        result.push({
          start: weekStart,
          end: weekEnd,
          label: `${format(weekStart, "dd MMM", { locale: pt })} — ${format(weekEnd, "dd MMM", { locale: pt })}`,
          items,
        });
      }
    }

    return result;
  }, [contracts]);

  if (weeks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Sem renovações nos próximos 90 dias
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {weeks.map((week, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-muted-foreground">{week.label}</h4>
            <Badge variant="secondary" className="text-xs">{week.items.length}</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatCurrency(week.items.reduce((s, c) => s + Number(c.total_mrr || 0), 0))} MRR
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {week.items.map((contract) => {
              const config = RENEWAL_STATUS_CONFIG[contract.status];
              return (
                <Card
                  key={contract.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/dashboard/renewals/${contract.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate flex-1">{contract.company?.name || "—"}</p>
                      <span className={`text-xs font-bold ${getHealthScoreColor(contract.health_score)}`}>
                        {contract.health_score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {contract.next_renewal_date && format(new Date(contract.next_renewal_date), "dd/MM/yyyy")}
                      </span>
                      <span className="text-xs font-semibold">{formatCurrency(Number(contract.total_mrr || 0))}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
