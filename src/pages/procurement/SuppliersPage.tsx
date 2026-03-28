import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSuppliers } from "@/hooks/useProcurement";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, Upload, Rss, Search, Star, Globe } from "lucide-react";
import { useState } from "react";
import { SupplierForm } from "@/components/procurement/SupplierForm";
import { SupplierSearchDialog } from "@/components/procurement/SupplierSearchDialog";
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
  const [showSearch, setShowSearch] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <PageHeader
          title={t("suppliers")}
          count={suppliers.length}
          actions={[
            {
              label: "Pesquisar",
              icon: <Search className="h-4 w-4" />,
              onClick: () => setShowSearch(true),
              variant: "outline" as const,
            },
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
                    <TableHead>Avaliação</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        {s.rating ? (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`h-3.5 w-3.5 ${star <= s.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{s.category || "—"}</TableCell>
                      <TableCell>{s.country || "—"}</TableCell>
                      <TableCell>
                        <ProcurementStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>{s.contact_person || s.email || "—"}</TableCell>
                      <TableCell>
                        {s.website ? (
                          <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 text-sm">
                            <Globe className="h-3 w-3" />Abrir
                          </a>
                        ) : "—"}
                      </TableCell>
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

        <SupplierSearchDialog
          open={showSearch}
          onOpenChange={setShowSearch}
          onImport={async (values) => {
            await create(values);
          }}
        />
      </div>
    </DashboardLayout>
  );
}