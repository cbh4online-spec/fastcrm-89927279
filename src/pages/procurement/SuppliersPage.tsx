import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSuppliers } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, Upload, Rss } from "lucide-react";
import { useState } from "react";
import { SupplierForm } from "@/components/procurement/SupplierForm";
import { PageHeader } from "@/components/common/PageHeader";
import { ProcurementStatusBadge } from "@/components/procurement/ProcurementStatusBadge";
import { ProcurementEmptyState } from "@/components/procurement/ProcurementEmptyState";
import { SupplierImportModal } from "@/components/procurement/SupplierImportModal";
import { SupplierFeedConfigDialog } from "@/components/procurement/SupplierFeedConfigDialog";
import { SupplierFeedCard } from "@/components/procurement/SupplierFeedCard";
import { useSupplierFeeds } from "@/hooks/useSupplierFeeds";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuppliersPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: suppliers = [], isLoading, create, update, remove } = useSuppliers(currentWorkspace?.id);
  const { feeds, syncingFeedId, isSyncing, syncNow, deleteFeed } = useSupplierFeeds();
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFeedDialog, setShowFeedDialog] = useState(false);
  const [editingFeed, setEditingFeed] = useState<any>(null);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("suppliers")}
          count={suppliers.length}
          actions={[
            {
              label: "Novo Feed",
              icon: <Rss className="h-4 w-4" />,
              onClick: () => { setEditingFeed(null); setShowFeedDialog(true); },
              variant: "outline" as const,
            },
            {
              label: t("importSuppliers"),
              icon: <Upload className="h-4 w-4" />,
              onClick: () => setShowImport(true),
              variant: "outline" as const,
            },
            {
              label: t("addSupplier"),
              icon: <Plus className="h-4 w-4" />,
              onClick: () => { setEditingSupplier(null); setShowForm(true); },
            },
          ]}
        />

        <Tabs defaultValue="suppliers">
          <TabsList>
            <TabsTrigger value="suppliers">{t("suppliers")}</TabsTrigger>
            <TabsTrigger value="feeds">
              Feeds
              {feeds.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5">{feeds.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : suppliers.length === 0 ? (
              <ProcurementEmptyState
                icon={<Users className="h-8 w-8 text-muted-foreground" />}
                title={t("noSuppliers")}
                description={t("noSuppliersHint")}
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
                    <TableHead>{t("email")}</TableHead>
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
          </TabsContent>

          <TabsContent value="feeds" className="mt-4">
            {feeds.length === 0 ? (
              <ProcurementEmptyState
                icon={<Rss className="h-8 w-8 text-muted-foreground" />}
                title="Sem feeds configurados"
                description="Configura um feed CSV para importar automaticamente produtos de fornecedores."
                actionLabel="Criar feed"
                onAction={() => { setEditingFeed(null); setShowFeedDialog(true); }}
              />
            ) : (
              <div className="space-y-3">
                {feeds.map(feed => (
                  <SupplierFeedCard
                    key={feed.id}
                    feed={feed}
                    isSyncing={syncingFeedId === feed.id}
                    onSync={() => syncNow.mutate(feed.id)}
                    onEdit={() => { setEditingFeed(feed); setShowFeedDialog(true); }}
                    onDelete={() => deleteFeed.mutate(feed.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

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

        <SupplierImportModal
          open={showImport}
          onOpenChange={setShowImport}
          workspaceId={currentWorkspace?.id}
          onComplete={() => {}}
        />

        <SupplierFeedConfigDialog
          open={showFeedDialog}
          onOpenChange={setShowFeedDialog}
          feed={editingFeed}
        />
      </div>
    </DashboardLayout>
  );
}