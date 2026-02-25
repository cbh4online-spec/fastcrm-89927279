import { useMemo, useState } from "react";
import { Opportunity, PipelineStage } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DealScore } from "@/hooks/useDealScores";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";
import { useTranslation } from "react-i18next";
import type { WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { formatCurrency } from "@/lib/formatters";

interface OpportunityKanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string, probability: number) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  onCreateOpportunity?: (stageId: string) => void;
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

  const totalValue = useMemo(
    () => opportunities.reduce((s, o) => s + Number(o.value || 0), 0),
    [opportunities]
  );

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
      {/* Column Header — minimal */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-foreground text-sm truncate">{stage.name}</h3>
            <span className="text-xs text-muted-foreground">{opportunities.length}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={() => onCreateOpportunity?.(stage.id)}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("kanbanAddOpportunity")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

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
