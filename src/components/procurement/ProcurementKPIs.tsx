import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useProcurementKPIs } from "@/hooks/useProcurement";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Clock, AlertTriangle, Package } from "lucide-react";

export function ProcurementKPIs() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: kpis } = useProcurementKPIs(currentWorkspace?.id);

  const cards = [
    { label: t("totalPurchasesMonth"), value: `€${(kpis?.totalMonth || 0).toFixed(0)}`, icon: ShoppingCart, color: "text-teal-500" },
    { label: t("pendingRequests"), value: kpis?.pendingRequests || 0, icon: Clock, color: "text-amber-500" },
    { label: t("unpaidInvoices"), value: `€${(kpis?.unpaidInvoices || 0).toFixed(0)}`, icon: AlertTriangle, color: "text-red-500" },
    { label: t("activeOrders"), value: kpis?.activeOrders || 0, icon: Package, color: "text-blue-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 ${c.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
