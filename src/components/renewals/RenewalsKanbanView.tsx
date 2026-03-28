import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { RENEWAL_STATUS_CONFIG, getHealthScoreColor } from "@/types/renewal";
import type { RenewalContract, RenewalContractStatus } from "@/types/renewal";

const COLUMNS: { status: RenewalContractStatus; label: string }[] = [
  { status: "active", label: "Ativos" },
  { status: "paused", label: "Pausados" },
  { status: "expired", label: "Expirados" },
  { status: "cancelled", label: "Cancelados" },
];

interface RenewalsKanbanViewProps {
  contracts: RenewalContract[];
  formatCurrency: (val: number) => string;
}

export function RenewalsKanbanView({ contracts, formatCurrency }: RenewalsKanbanViewProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = contracts.filter((c) => c.status === col.status);
        const config = RENEWAL_STATUS_CONFIG[col.status];
        const totalMRR = items.reduce((s, c) => s + Number(c.total_mrr || 0), 0);

        return (
          <div key={col.status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${config.color}`}>{col.label}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{formatCurrency(totalMRR)}</span>
            </div>

            <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Sem contratos</p>
              )}
              {items.map((contract) => (
                <Card
                  key={contract.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/dashboard/renewals/${contract.id}`)}
                >
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-medium truncate">{contract.company?.name || "—"}</p>
                    {contract.contact?.name && (
                      <p className="text-xs text-muted-foreground">{contract.contact.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{formatCurrency(Number(contract.total_mrr || 0))}/mês</span>
                      <div className="flex items-center gap-1">
                        <Progress value={contract.health_score} className="w-8 h-1.5" />
                        <span className={`text-[10px] font-medium ${getHealthScoreColor(contract.health_score)}`}>
                          {contract.health_score}
                        </span>
                      </div>
                    </div>
                    {contract.next_renewal_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(contract.next_renewal_date), "dd MMM yyyy", { locale: pt })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
