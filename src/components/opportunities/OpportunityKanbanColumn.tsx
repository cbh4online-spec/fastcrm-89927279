import { useMemo, useState } from "react";
import { Opportunity, PipelineStage } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DollarSign, 
  Plus, 
  Clock, 
  TrendingUp,
  Target,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface OpportunityKanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string, probability: number) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  onCreateOpportunity?: (stageId: string) => void;
  draggedId: string | null;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
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
}: OpportunityKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const stats = useMemo(() => {
    const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value || 0), 0);
    const probability = stage.probability || 50;
    const weightedValue = totalValue * (probability / 100);
    
    // Calculate average days in stage
    const avgDays = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => {
          return sum + differenceInDays(new Date(), new Date(opp.created_at));
        }, 0) / opportunities.length
      : 0;
    
    return { totalValue, weightedValue, avgDays, probability };
  }, [opportunities, stage.probability]);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M €`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K €`;
    }
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
      onMoveOpportunity(oppId, stage.id, stats.probability);
    }
  };

  // Get color for probability bar
  const getProbabilityColor = (probability: number): string => {
    if (probability >= 75) return "bg-green-500";
    if (probability >= 50) return "bg-amber-500";
    if (probability >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-80 flex flex-col rounded-lg bg-muted/30 border border-border transition-all",
        isDragOver && "bg-primary/5 border-primary/50 ring-2 ring-primary/20"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Enhanced Column Header */}
      <div className="p-3 border-b border-border space-y-3">
        {/* Row 1: Name + Count + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background"
              style={{ 
                backgroundColor: stage.color,
                boxShadow: `0 0 8px ${stage.color}40`
              }}
            />
            <h3 className="font-medium text-foreground truncate">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs font-semibold">
              {opportunities.length}
            </Badge>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary/10"
                onClick={() => onCreateOpportunity?.(stage.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar oportunidade</TooltipContent>
          </Tooltip>
        </div>

        {/* Row 2: Probability Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              Probabilidade
            </span>
            <span className="font-medium text-foreground">{stats.probability}%</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                getProbabilityColor(stats.probability)
              )}
              style={{ width: `${stats.probability}%` }}
            />
          </div>
        </div>

        {/* Row 3: Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/50 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <DollarSign className="w-3 h-3" />
              Valor Total
            </div>
            <p className="font-semibold text-foreground text-sm">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
          <div className="bg-background/50 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <TrendingUp className="w-3 h-3" />
              Ponderado
            </div>
            <p className="font-semibold text-foreground text-sm">
              {formatCurrency(stats.weightedValue)}
            </p>
          </div>
        </div>

        {/* Row 4: Average Days */}
        {opportunities.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-background/30 rounded-md py-1.5">
            <Clock className="w-3 h-3" />
            <span>Média: <strong className="text-foreground">{Math.round(stats.avgDays)} dias</strong> nesta etapa</span>
          </div>
        )}
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
          
          {/* Enhanced Empty State */}
          {opportunities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Arraste oportunidades para aqui
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onCreateOpportunity?.(stage.id)}
              >
                <Plus className="w-4 h-4" />
                Novo Negócio
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
