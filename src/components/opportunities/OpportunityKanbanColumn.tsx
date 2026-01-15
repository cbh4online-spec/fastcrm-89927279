import { Opportunity, PipelineStage } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OpportunityKanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string, probability: number) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  draggedId: string | null;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
}

export function OpportunityKanbanColumn({
  stage,
  opportunities,
  onMoveOpportunity,
  onOpportunityClick,
  draggedId,
  onDragStart,
  onDragEnd,
}: OpportunityKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
  const weightedValue = opportunities.reduce(
    (sum, opp) => sum + (Number(opp.value) * (opp.probability || 50) / 100),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId) {
      onMoveOpportunity(oppId, stage.id, stage.probability || 50);
    }
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-80 flex flex-col rounded-lg bg-muted/30 border border-border transition-colors",
        isDragOver && "bg-primary/5 border-primary/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-foreground truncate">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {opportunities.length}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            <Percent className="w-3 h-3 mr-1" />
            {stage.probability || 50}%
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground">{formatCurrency(totalValue)}</span>
            <span className="text-xs">total</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>~{formatCurrency(weightedValue)} ponderado</span>
          </div>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", opp.id);
                onDragStart(opp.id);
              }}
              onDragEnd={onDragEnd}
            >
              <OpportunityCard
                opportunity={opp}
                isDragging={draggedId === opp.id}
                onClick={onOpportunityClick ? () => onOpportunityClick(opp) : undefined}
              />
            </div>
          ))}
          {opportunities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Arraste oportunidades para aqui
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
