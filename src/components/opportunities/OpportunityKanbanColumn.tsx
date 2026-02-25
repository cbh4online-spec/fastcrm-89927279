import { useMemo, useState } from "react";
import { Opportunity, PipelineStage } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DealScore } from "@/hooks/useDealScores";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";
import { useTranslation } from "react-i18next";
import type { WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { formatCurrency } from "@/lib/formatters";
import { useUpdatePipelineStage, useDeletePipelineStage } from "@/hooks/usePipelineStages";
import { toast } from "sonner";

interface OpportunityKanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string, probability: number) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  onCreateOpportunity?: (stageId: string) => void;
  onEditOpportunity?: (opportunity: Opportunity) => void;
  onDeleteOpportunity?: (opportunity: Opportunity) => void;
  draggedId: string | null;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
  scoresMap?: Map<string, DealScore>;
  healthMap?: Map<string, CompactDealIntelligence>;
  allStages?: PipelineStage[];
  membersMap?: Map<string, WorkspaceMember["profile"]>;
}

export function OpportunityKanbanColumn({
  stage,
  opportunities,
  onMoveOpportunity,
  onOpportunityClick,
  onCreateOpportunity,
  onEditOpportunity,
  onDeleteOpportunity,
  draggedId,
  onDragStart,
  onDragEnd,
  scoresMap,
  healthMap,
  allStages,
  membersMap,
}: OpportunityKanbanColumnProps) {
  const { t } = useTranslation("crm");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [editColor, setEditColor] = useState(stage.color);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();

  const totalValue = useMemo(
    () => opportunities.reduce((s, o) => s + Number(o.value || 0), 0),
    [opportunities]
  );

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await updateStage.mutateAsync({ id: stage.id, name: editName.trim(), color: editColor });
      toast.success("Estágio atualizado");
      setIsEditing(false);
    } catch {
      toast.error("Erro ao atualizar estágio");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStage.mutateAsync(stage.id);
      toast.success("Estágio removido");
    } catch (error: any) {
      if (error.message?.includes("foreign key")) {
        toast.error("Não é possível remover estágio com oportunidades.");
      } else {
        toast.error("Erro ao remover estágio");
      }
    }
    setShowDeleteConfirm(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => { setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId) onMoveOpportunity(oppId, stage.id, stage.probability || 50);
  };

  return (
    <motion.div
      className={cn(
        "flex-shrink-0 w-80 flex flex-col rounded-lg bg-muted/30 border border-border",
        isDragOver && "border-primary/50 ring-2 ring-primary/20"
      )}
      animate={{
        backgroundColor: isDragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--muted) / 0.3)",
        scale: isDragOver ? 1.01 : 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isEditing ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 flex-shrink-0"
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") { setIsEditing(false); setEditName(stage.name); setEditColor(stage.color); }
                  }}
                />
                <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={handleSaveEdit} disabled={updateStage.isPending}>
                  OK
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setIsEditing(false); setEditName(stage.name); setEditColor(stage.color); }}>
                  ✕
                </Button>
              </>
            ) : (
              <>
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-medium text-foreground text-sm truncate">{stage.name}</h3>
                <span className="text-xs text-muted-foreground">{opportunities.length}</span>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditName(stage.name); setEditColor(stage.color); setIsEditing(true); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar estágio
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={opportunities.length > 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover estágio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={() => onCreateOpportunity?.(stage.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("kanbanAddOpportunity")}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover estágio "{stage.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não existem oportunidades neste estágio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {opportunities.map((opp) => (
              <motion.div
                key={opp.id}
                layout
                layoutId={opp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                draggable
                onDragStart={(e: any) => { e.dataTransfer?.setData("text/plain", opp.id); onDragStart(opp.id); }}
                onDragEnd={onDragEnd}
              >
                <OpportunityCard
                  opportunity={opp}
                  isDragging={draggedId === opp.id}
                  onClick={onOpportunityClick ? () => onOpportunityClick(opp) : undefined}
                  onEdit={onEditOpportunity}
                  onDelete={onDeleteOpportunity}
                  dealScore={scoresMap?.get(opp.id)}
                  healthIntelligence={healthMap?.get(opp.id)}
                  stages={allStages}
                  ownerProfile={membersMap?.get(opp.owner_id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {opportunities.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center py-8 px-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t("kanbanDragHere")}</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => onCreateOpportunity?.(stage.id)}>
                  <Plus className="w-4 h-4" />
                  {t("kanbanNewDeal")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Column Footer — Simple Sum */}
      <div className="border-t border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {formatCurrency(totalValue)} sum
        </span>
      </div>
    </motion.div>
  );
}
