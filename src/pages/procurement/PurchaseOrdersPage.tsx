import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePurchaseOrders } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PurchaseOrderForm } from "@/components/procurement/PurchaseOrderForm";

const statusColors: Record<string, string> = {
  draft: "secondary",
  sent: "outline",
  confirmed: "default",
  partial: "outline",
  received: "default",
  closed: "secondary",
  cancelled: "destructive",
};

export default function PurchaseOrdersPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: orders = [], isLoading, create } = usePurchaseOrders(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("orders")}</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />{t("newOrder")}
          </Button>
        </div>
        
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground">{t("noOrders")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("poNumber")}</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("totalAmount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>RFQ</TableHead>
                <TableHead>{t("projects")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead>{t("expectedDelivery")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders as any[]).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium font-mono">
                    <div className="flex items-center gap-1.5">
                      {o.rfq_id && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      {o.po_number || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{o.supplier?.name || "—"}</TableCell>
                  <TableCell>€{(Number(o.total_amount) || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[o.status] as any}>{t(o.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    {o.rfqs ? (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent text-xs"
                        onClick={() => navigate(`/dashboard/procurement/rfqs/${o.rfq_id}`)}
                      >
                        {o.rfqs.rfq_number || o.rfqs.title || "RFQ"}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {o.procurement_projects ? (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent text-xs"
                        onClick={() => navigate(`/dashboard/procurement/projects`)}
                      >
                        {o.procurement_projects.name}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{o.items?.length || 0}</TableCell>
                  <TableCell>{o.expected_delivery || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <PurchaseOrderForm
          open={showForm}
          onOpenChange={setShowForm}
          workspaceId={currentWorkspace?.id}
          onSave={async (values) => {
            await create(values);
            setShowForm(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
