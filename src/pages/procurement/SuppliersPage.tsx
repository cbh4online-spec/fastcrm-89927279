import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSuppliers } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { SupplierForm } from "@/components/procurement/SupplierForm";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";
import { Loader2 } from "lucide-react";

export default function SuppliersPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: suppliers = [], isLoading, create, update, remove } = useSuppliers(currentWorkspace?.id);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("suppliers")}
          count={suppliers.length}
          actions={[
            {
              label: t("addSupplier"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => { setEditingSupplier(null); setShowForm(true); },
            },
          ]}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : suppliers.length === 0 ? (
          <ProcurementEmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title={t("noSuppliers")}
            actionLabel={t("addSupplier")}
            onAction={() => { setEditingSupplier(null); setShowForm(true); }}
          />
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
                    <ProcurementStatusBadge status={s.status} />
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
