import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useGoodsReceipts } from "@/hooks/useProcurement";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, PackageCheck } from "lucide-react";
import { useState } from "react";
import { GoodsReceiptForm } from "@/components/procurement/GoodsReceiptForm";
import { format } from "date-fns";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";

export default function GoodsReceiptsPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: receipts = [], isLoading } = useGoodsReceipts(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("receipts")}
          count={(receipts as any[]).length}
          actions={[
            {
              label: t("newReceipt"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setShowForm(true),
            },
          ]}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (receipts as any[]).length === 0 ? (
          <ProcurementEmptyState
            icon={<PackageCheck className="h-8 w-8 text-muted-foreground" />}
            title={t("noReceipts")}
            actionLabel={t("newReceipt")}
            onAction={() => setShowForm(true)}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("poNumber")}</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(receipts as any[]).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.purchase_order?.po_number || "—"}</TableCell>
                  <TableCell>{r.purchase_order?.supplier?.name || "—"}</TableCell>
                  <TableCell>{r.items?.length || 0}</TableCell>
                  <TableCell>{format(new Date(r.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <GoodsReceiptForm
          open={showForm}
          onOpenChange={setShowForm}
          workspaceId={currentWorkspace?.id}
          onSave={async () => { setShowForm(false); }}
        />
      </div>
    </DashboardLayout>
  );
}
