import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useGoodsReceipts } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useState } from "react";
import { GoodsReceiptForm } from "@/components/procurement/GoodsReceiptForm";
import { format } from "date-fns";

export default function GoodsReceiptsPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: receipts = [], isLoading } = useGoodsReceipts(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("receipts")}</h1>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />{t("newReceipt")}
          </Button>
        </div>
        
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : receipts.length === 0 ? (
          <p className="text-muted-foreground">{t("noReceipts")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("poNumber")}</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead>Data</TableHead>
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
