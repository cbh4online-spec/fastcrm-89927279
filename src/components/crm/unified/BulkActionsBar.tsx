import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Download, Tag, X, Plus, Pencil } from "lucide-react";
import { CrmEntityType } from "@/hooks/useCrmViews";
import { toast } from "sonner";
import { BulkEditDialog, BulkEditField } from "./BulkEditDialog";

interface BulkActionsBarProps {
  entityType: CrmEntityType;
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => Promise<void>;
  onExport: () => void;
  onAddTags: (tags: string[]) => Promise<void>;
  onBulkEdit?: (changes: Record<string, unknown>) => Promise<void>;
  availableTags?: string[];
  editableFields?: BulkEditField[];
}

export function BulkActionsBar({
  entityType,
  selectedCount,
  onClearSelection,
  onDelete,
  onExport,
  onAddTags,
  onBulkEdit,
  availableTags = [],
  editableFields = [],
}: BulkActionsBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingTags, setIsApplyingTags] = useState(false);

  const entityLabel = entityType === "contacts" ? "contacto" : "negócio";
  const entityLabelPlural = entityType === "contacts" ? "contactos" : "negócios";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success(`${selectedCount} ${selectedCount === 1 ? entityLabel : entityLabelPlural} eliminado${selectedCount === 1 ? "" : "s"}`);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao eliminar registos");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleApplyTags = async () => {
    if (selectedTags.length === 0) {
      toast.error("Selecione pelo menos uma etiqueta");
      return;
    }
    setIsApplyingTags(true);
    try {
      await onAddTags(selectedTags);
      toast.success(`Etiquetas aplicadas a ${selectedCount} ${selectedCount === 1 ? entityLabel : entityLabelPlural}`);
      setSelectedTags([]);
      setTagPopoverOpen(false);
    } catch (error) {
      toast.error("Erro ao aplicar etiquetas");
    } finally {
      setIsApplyingTags(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {selectedCount} {selectedCount === 1 ? entityLabel : entityLabelPlural} selecionado{selectedCount === 1 ? "" : "s"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar seleção
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Tags */}
          {entityType === "contacts" && (
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Adicionar etiquetas</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Aplicar etiquetas</h4>
                    <p className="text-xs text-muted-foreground">
                      Adicione etiquetas aos {selectedCount} {selectedCount === 1 ? entityLabel : entityLabelPlural} selecionados.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova etiqueta..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button size="sm" variant="secondary" onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Available tags */}
                  {availableTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Etiquetas existentes:</p>
                      <div className="flex flex-wrap gap-1">
                        {availableTags.slice(0, 10).map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              if (selectedTags.includes(tag)) {
                                handleRemoveTag(tag);
                              } else {
                                setSelectedTags([...selectedTags, tag]);
                              }
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected tags */}
                  {selectedTags.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">A aplicar:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleApplyTags}
                    disabled={selectedTags.length === 0 || isApplyingTags}
                  >
                    {isApplyingTags ? "A aplicar..." : `Aplicar a ${selectedCount} registos`}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Bulk Edit */}
          {onBulkEdit && editableFields.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkEditOpen(true)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar campos</span>
            </Button>
          )}

          {/* Export */}
          <Button variant="outline" size="sm" onClick={onExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        </div>
      </div>

      {/* Bulk Edit Dialog */}
      {onBulkEdit && (
        <BulkEditDialog
          open={bulkEditOpen}
          onOpenChange={setBulkEditOpen}
          entityType={entityType}
          selectedCount={selectedCount}
          fields={editableFields}
          onApply={onBulkEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá eliminar permanentemente {selectedCount}{" "}
              {selectedCount === 1 ? entityLabel : entityLabelPlural}. Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
