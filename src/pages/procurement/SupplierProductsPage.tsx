import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSupplierProducts, useSuppliers } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { SupplierProductForm } from "@/components/procurement/SupplierProductForm";

export default function SupplierProductsPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: catalog = [], isLoading, create, update, remove } = useSupplierProducts(currentWorkspace?.id);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("supplierProducts")}</h1>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />{t("addCatalogEntry")}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : catalog.length === 0 ? (
          <p className="text-muted-foreground">{t("noCatalogEntries")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("supplier")}</TableHead>
                <TableHead>{t("catalogPrice")}</TableHead>
                <TableHead>{t("leadTime")}</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>{t("preferred")}</TableHead>
                <TableHead>{t("qualityScore")}</TableHead>
                <TableHead>{t("reliabilityScore")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(catalog as any[]).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.product?.name || "—"}</TableCell>
                  <TableCell>{entry.supplier?.name || "—"}</TableCell>
                  <TableCell>€{(Number(entry.unit_price) || 0).toFixed(2)}</TableCell>
                  <TableCell>{entry.lead_time_days ? `${entry.lead_time_days}d` : "—"}</TableCell>
                  <TableCell>{entry.min_order_qty}</TableCell>
                  <TableCell>
                    {entry.is_preferred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </TableCell>
                  <TableCell>{entry.quality_score ?? "—"}</TableCell>
                  <TableCell>{entry.reliability_score ?? "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditItem(entry); setShowForm(true); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <SupplierProductForm
          open={showForm}
          onOpenChange={setShowForm}
          workspaceId={currentWorkspace?.id}
          editItem={editItem}
          onSave={async (values) => {
            if (editItem) {
              await update({ id: editItem.id, ...values });
            } else {
              await create(values);
            }
            setShowForm(false);
            setEditItem(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
