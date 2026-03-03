import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSuppliers } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { SupplierForm } from "@/components/procurement/SupplierForm";

export default function SuppliersPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: suppliers = [], isLoading, create, update, remove } = useSuppliers(currentWorkspace?.id);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("suppliers")}</h1>
          <Button onClick={() => { setEditingSupplier(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />{t("addSupplier")}
          </Button>
        </div>
        
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : suppliers.length === 0 ? (
          <p className="text-muted-foreground">{t("noSuppliers")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("supplierName")}</TableHead>
                <TableHead>{t("vatNumber")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.vat_number || "—"}</TableCell>
                  <TableCell>{s.category || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>
                      {t(s.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.email || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingSupplier(s); setShowForm(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <SupplierForm
          open={showForm}
          onOpenChange={setShowForm}
          supplier={editingSupplier}
          onSave={async (values) => {
            if (editingSupplier) {
              await update({ id: editingSupplier.id, ...values });
            } else {
              await create(values);
            }
            setShowForm(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
