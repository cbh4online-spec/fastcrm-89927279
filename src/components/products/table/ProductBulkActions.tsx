import { Button } from "@/components/ui/button";
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
import { Download, DollarSign, Archive, Trash2 } from "lucide-react";
import { BulkCostDialog } from "../BulkCostDialog";

interface ProductBulkActionsProps {
  selectedIds: string[];
  bulkDeleteOpen: boolean;
  setBulkDeleteOpen: (open: boolean) => void;
  bulkCostOpen: boolean;
  setBulkCostOpen: (open: boolean) => void;
  onBulkExport: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => Promise<void>;
  onClearSelection: () => void;
}

export function ProductBulkActions({
  selectedIds,
  bulkDeleteOpen,
  setBulkDeleteOpen,
  bulkCostOpen,
  setBulkCostOpen,
  onBulkExport,
  onBulkArchive,
  onBulkDelete,
  onClearSelection,
}: ProductBulkActionsProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-2 px-4 bg-muted/50 rounded-lg mb-4">
      <span className="text-sm text-muted-foreground">
        {selectedIds.length} {selectedIds.length === 1 ? "selecionado" : "selecionados"}
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={onBulkExport} className="gap-2">
        <Download className="h-4 w-4" /> Exportar
      </Button>
      <Button variant="outline" size="sm" onClick={() => setBulkCostOpen(true)} className="gap-2">
        <DollarSign className="h-4 w-4" /> Definir Custo
      </Button>
      <Button variant="outline" size="sm" onClick={onBulkArchive} className="gap-2">
        <Archive className="h-4 w-4" /> Arquivar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setBulkDeleteOpen(true)}
        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" /> Apagar
      </Button>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Apagar {selectedIds.length} produto{selectedIds.length !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser revertida. Os produtos selecionados serão apagados definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await onBulkDelete();
                onClearSelection();
                setBulkDeleteOpen(false);
              }}
            >
              Apagar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkCostDialog
        open={bulkCostOpen}
        onOpenChange={setBulkCostOpen}
        selectedIds={selectedIds}
        onComplete={onClearSelection}
      />
    </div>
  );
}
