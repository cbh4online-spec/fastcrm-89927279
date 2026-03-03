import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSupplierInvoices } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SupplierInvoiceForm } from "@/components/procurement/SupplierInvoiceForm";

const statusColors: Record<string, string> = {
  pending: "outline",
  paid: "default",
  overdue: "destructive",
};

export default function SupplierInvoicesPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: invoices = [], isLoading, create, updateStatus } = useSupplierInvoices(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("invoices")}</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />{t("newInvoice")}
          </Button>
        </div>
        
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : invoices.length === 0 ? (
          <p className="text-muted-foreground">{t("noInvoices")}</p>
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
                    <Badge variant={statusColors[inv.status] as any}>{t(inv.status)}</Badge>
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
