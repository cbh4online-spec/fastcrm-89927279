import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSupplierInvoices } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { SupplierInvoiceForm } from "@/components/procurement/SupplierInvoiceForm";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";

export default function SupplierInvoicesPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: invoices = [], isLoading, create, updateStatus } = useSupplierInvoices(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("invoices")}
          count={(invoices as any[]).length}
          actions={[
            {
              label: t("newInvoice"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowForm(true),
            },
          ]}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (invoices as any[]).length === 0 ? (
          <ProcurementEmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title={t("noInvoices")}
            actionLabel={t("newInvoice")}
            onAction={() => setShowForm(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoiceNumber")}</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("poNumber")}</TableHead>
                <TableHead>{t("totalAmount")}</TableHead>
                <TableHead>{t("dueDate")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices as any[]).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number || "—"}</TableCell>
                  <TableCell>{inv.supplier?.name || "—"}</TableCell>
                  <TableCell className="font-mono">{inv.purchase_order?.po_number || "—"}</TableCell>
                  <TableCell>€{(Number(inv.total) || 0).toFixed(2)}</TableCell>
                  <TableCell>{inv.due_date || "—"}</TableCell>
                  <TableCell>
                    <ProcurementStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell>
                    {inv.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus({ id: inv.id, status: "paid" })}>
                        {t("paid")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <SupplierInvoiceForm
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
