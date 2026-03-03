import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { NeedsBoardHeader } from "@/components/procurement/needs/NeedsBoardHeader";
import { NeedsBoardTable } from "@/components/procurement/needs/NeedsBoardTable";
import { NeedsBoardFilters } from "@/components/procurement/needs/NeedsBoardFilters";
import { NeedDetailDrawer } from "@/components/procurement/needs/NeedDetailDrawer";
import { useProcurementNeedsBoard, useRecomputeNeeds, useUpdateNeedStatus, useCreatePOsFromNeeds, useCreateRFQFromNeeds, useUpdateNeedSupplier, ProcurementNeed } from "@/hooks/useProcurementNeeds";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProcurementNeedsBoardPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: needs = [], isLoading } = useProcurementNeedsBoard(workspaceId);
  const recompute = useRecomputeNeeds(workspaceId);
  const updateStatus = useUpdateNeedStatus(workspaceId);
  const createPOs = useCreatePOsFromNeeds(workspaceId);
  const createRFQ = useCreateRFQFromNeeds(workspaceId);
  const updateSupplier = useUpdateNeedSupplier(workspaceId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailNeed, setDetailNeed] = useState<ProcurementNeed | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRFQWarning, setShowRFQWarning] = useState(false);
  const [itemsMissingSupplier, setItemsMissingSupplier] = useState(0);

  const filteredNeeds = useMemo(() => {
    let result = needs;

    if (filter === "shortage") result = result.filter(n => n.shortage > 0);
    else if (filter === "reorder") result = result.filter(n => n.stock_available < (n.stock_on_hand * 0.2 || 5));
    else if (filter === "urgent") {
      const in7days = new Date();
      in7days.setDate(in7days.getDate() + 7);
      result = result.filter(n => n.earliest_due_date && new Date(n.earliest_due_date) <= in7days);
    }
    else if (filter === "proposals") result = result.filter(n => n.demand_sources_json?.some((s: any) => s.type === "proposal"));
    else if (filter === "orders") result = result.filter(n => n.demand_sources_json?.some((s: any) => s.type === "order_note"));
    else if (filter === "projects") result = result.filter(n => n.demand_sources_json?.some((s: any) => s.type === "project"));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        (n.products?.name || "").toLowerCase().includes(q) ||
        (n.products?.sku || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [needs, filter, searchQuery]);

  const handleChooseSupplier = (needId: string, supplierId: string, unitPrice: number) => {
    updateSupplier.mutate({ needId, supplierId, unitPrice });
  };

  const handleBulkCreatePO = () => {
    if (!selectedIds.length) return;
    createPOs.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) });
  };

  const proceedCreateRFQ = () => {
    createRFQ.mutate({ needIds: selectedIds }, { onSuccess: () => setSelectedIds([]) });
  };

  const handleBulkCreateRFQ = () => {
    if (!selectedIds.length) return;
    const selectedNeeds = needs.filter(n => selectedIds.includes(n.id));
    const missing = selectedNeeds.filter(n => !n.recommended_supplier_id).length;
    if (missing > 0) {
      setItemsMissingSupplier(missing);
      setShowRFQWarning(true);
    } else {
      proceedCreateRFQ();
    }
  };

  const handleIgnore = (needId: string) => {
    updateStatus.mutate({ needId, status: "ignored" });
  };

  const handleExportCSV = () => {
    const headers = ["Produto", "SKU", "Stock Disponível", "Procura", "Em Falta", "Data Urgente", "Fornecedor", "Status"];
    const rows = filteredNeeds.map(n => [
      n.products?.name || "",
      n.products?.sku || "",
      n.stock_available,
      n.demand_total,
      n.shortage,
      n.earliest_due_date || "",
      n.suppliers?.name || "",
      n.status,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `necessidades-compra-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <NeedsBoardHeader
          totalNeeds={filteredNeeds.length}
          totalShortage={filteredNeeds.reduce((s, n) => s + n.shortage, 0)}
          totalValue={filteredNeeds.reduce((s, n) => s + n.estimated_value, 0)}
          isRecomputing={recompute.isPending}
          onRecompute={() => recompute.mutate()}
          selectedCount={selectedIds.length}
          onBulkCreatePO={handleBulkCreatePO}
          onBulkCreateRFQ={handleBulkCreateRFQ}
          onExportCSV={handleExportCSV}
          isCreatingPO={createPOs.isPending}
          isCreatingRFQ={createRFQ.isPending}
        />
        <NeedsBoardFilters
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <NeedsBoardTable
          needs={filteredNeeds}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onViewDetail={setDetailNeed}
          onIgnore={handleIgnore}
          onCreatePO={(id) => createPOs.mutate([id])}
          onChooseSupplier={handleChooseSupplier}
        />
        <NeedDetailDrawer
          need={detailNeed}
          onClose={() => setDetailNeed(null)}
          onIgnore={handleIgnore}
          onCreatePO={(id) => createPOs.mutate([id])}
          onChooseSupplier={handleChooseSupplier}
        />

        <AlertDialog open={showRFQWarning} onOpenChange={setShowRFQWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Itens sem fornecedor recomendado</AlertDialogTitle>
              <AlertDialogDescription>
                {itemsMissingSupplier} dos {selectedIds.length} itens selecionados não têm fornecedor recomendado. A RFQ será criada sem fornecedores pré-selecionados para esses itens. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowRFQWarning(false); proceedCreateRFQ(); }}>
                Continuar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}