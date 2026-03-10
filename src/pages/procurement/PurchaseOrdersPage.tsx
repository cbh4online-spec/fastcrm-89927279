import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePurchaseOrders, useConvertPOToInvoice } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Loader2, ShoppingCart, FileText, Download } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PurchaseOrderForm } from "@/components/procurement/PurchaseOrderForm";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";
import Papa from "papaparse";

export default function PurchaseOrdersPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: orders = [], isLoading, create } = usePurchaseOrders(currentWorkspace?.id);
  const convertToInvoice = useConvertPOToInvoice(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const handleExportCSV = () => {
    const csvData = (orders as any[]).map((o) => ({
      [t("poNumber")]: o.po_number || "",
      [t("supplier")]: o.supplier?.name || "",
      [t("totalAmount")]: Number(o.total_amount) || 0,
      [t("status")]: o.status,
      [t("expectedDelivery")]: o.expected_delivery || "",
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConvertToInvoice = (order: any) => {
    convertToInvoice.mutate({
      orderId: order.id,
      supplierId: order.supplier?.id || order.supplier_id,
      totalAmount: Number(order.total_amount) || 0,
      poNumber: order.po_number,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("orders")}
          count={(orders as any[]).length}
          actions={[
            ...((orders as any[]).length > 0 ? [{
              label: t("exportCSV"),
              icon: <Download className="h-4 w-4" />,
              onClick: handleExportCSV,
              variant: "outline" as const,
            }] : []),
            {
              label: t("newOrder"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowForm(true),
            },
          ]}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (orders as any[]).length === 0 ? (
          <ProcurementEmptyState
            icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
            title={t("noOrders")}
            description={t("noOrdersHint")}
            actionLabel={t("newOrder")}
            onAction={() => setShowForm(true)}
          />
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
                <TableHead></TableHead>
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
                    <ProcurementStatusBadge status={o.status} />
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
                  <TableCell className="text-right">
                    {o.status === "received" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvertToInvoice(o)}
                        disabled={convertToInvoice.isPending}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {t("convertToInvoice")}
                      </Button>
                    )}
                  </TableCell>
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