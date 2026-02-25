import { useMemo, useState } from "react";
import { Opportunity, PipelineStage } from "@/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  Plus,
  Clock,
  TrendingUp,
  Target,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays } from "date-fns";
import { DealScore, getCategoryColors } from "@/hooks/useDealScores";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";
import { useTranslation } from "react-i18next";
import type { WorkspaceMember } from "@/hooks/useWorkspaceMembers";

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

type CalcType = "sum" | "avg" | "min" | "max" | "count";

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
  const [activeCalc, setActiveCalc] = useState<CalcType | null>(null);

  const stats = useMemo(() => {
    const values = opportunities.map((o) => Number(o.value || 0));
    const totalValue = values.reduce((s, v) => s + v, 0);
    const probability = stage.probability || 50;
    const weightedValue = totalValue * (probability / 100);

    const avgDays =
      opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + differenceInDays(new Date(), new Date(opp.created_at)), 0) / opportunities.length
        : 0;

    const oppsWithScore = scoresMap ? opportunities.filter((o) => scoresMap.has(o.id)) : [];
    const avgScore =
      oppsWithScore.length > 0
        ? oppsWithScore.reduce((sum, o) => sum + scoresMap!.get(o.id)!.close_score, 0) / oppsWithScore.length
        : null;

    const avg = values.length > 0 ? totalValue / values.length : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    return { totalValue, weightedValue, avgDays, probability, avgScore, avg, min, max, count: opportunities.length };
  }, [opportunities, stage.probability, scoresMap]);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M €`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K €`;
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => { setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId) onMoveOpportunity(oppId, stage.id, stats.probability);
  };

  const getProbabilityColor = (probability: number): string => {
    if (probability >= 75) return "bg-green-500";
    if (probability >= 50) return "bg-amber-500";
    if (probability >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getCalcValue = (type: CalcType): string => {
    switch (type) {
      case "sum": return formatCurrency(stats.totalValue);
      case "avg": return formatCurrency(stats.avg);
      case "min": return formatCurrency(stats.min);
      case "max": return formatCurrency(stats.max);
      case "count": return String(stats.count);
    }
  };

  const getCalcLabel = (type: CalcType): string => {
    switch (type) {
      case "sum": return t("kanbanCalcSum");
      case "avg": return t("kanbanCalcAvg");
      case "min": return t("kanbanCalcMin");
      case "max": return t("kanbanCalcMax");
      case "count": return t("kanbanCalcCount");
    }
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
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background"
              style={{ backgroundColor: stage.color, boxShadow: `0 0 8px ${stage.color}40` }}
            />
            <h3 className="font-medium text-foreground truncate">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs font-semibold">{opportunities.length}</Badge>
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

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              {t("probability")}
            </span>
            <span className="font-medium text-foreground">{stats.probability}%</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getProbabilityColor(stats.probability))} style={{ width: `${stats.probability}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/50 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <DollarSign className="w-3 h-3" />
              {t("kanbanTotalValue")}
            </div>
            <p className="font-semibold text-foreground text-sm">{formatCurrency(stats.totalValue)}</p>
          </div>
          <div className="bg-background/50 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <TrendingUp className="w-3 h-3" />
              {t("kanbanWeighted")}
            </div>
            <p className="font-semibold text-foreground text-sm">{formatCurrency(stats.weightedValue)}</p>
          </div>
        </div>

        {opportunities.length > 0 && (
          <div className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground bg-background/30 rounded-md py-1.5 px-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{t("kanbanAvgDays", { days: Math.round(stats.avgDays) })}</span>
            </div>
            {stats.avgScore !== null && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{t("kanbanScore")} <strong className="text-foreground">{Math.round(stats.avgScore)}</strong></span>
              </div>
            )}
          </div>
        )}
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

      {/* Column Footer — Calculation */}
      <div className="border-t border-border p-2">
        {activeCalc ? (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground font-medium">{getCalcLabel(activeCalc)}</span>
            <span className="font-semibold text-foreground">{getCalcValue(activeCalc)}</span>
          </div>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5">
              <Calculator className="w-3 h-3" />
              {t("kanbanAddCalculation")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(["sum", "avg", "count", "min", "max"] as CalcType[]).map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => setActiveCalc(activeCalc === type ? null : type)}
                className={cn(activeCalc === type && "bg-accent")}
              >
                {getCalcLabel(type)}: {getCalcValue(type)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
