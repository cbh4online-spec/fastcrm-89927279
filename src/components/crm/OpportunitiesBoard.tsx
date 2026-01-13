import { useState, useMemo } from "react";
import { useOpportunities, useMoveOpportunity, Opportunity } from "@/hooks/useOpportunities";
import { usePipelineStages, PipelineStage } from "@/hooks/usePipelineStages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Settings, DollarSign, User, GripVertical } from "lucide-react";
import { CreateOpportunityDialog } from "./CreateOpportunityDialog";
import { PipelineSettingsDialog } from "./PipelineSettingsDialog";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onMoveOpportunity: (oppId: string, stageId: string) => void;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
  draggedId: string | null;
}

function KanbanColumn({
  stage,
  opportunities,
  onMoveOpportunity,
  onDragStart,
  onDragEnd,
  draggedId,
}: KanbanColumnProps) {
  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-accent/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-accent/50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-accent/50");
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId && oppId !== draggedId) {
      onMoveOpportunity(oppId, stage.id);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-80 flex flex-col rounded-lg bg-muted/30 border border-border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-foreground">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {opportunities.length}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <DollarSign className="w-3.5 h-3.5" />
          {totalValue.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          })}
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <Card
              key={opp.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", opp.id);
                onDragStart(opp.id);
              }}
              onDragEnd={onDragEnd}
              className={cn(
                "cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors",
                draggedId === opp.id && "opacity-50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {opp.title}
                    </h4>
                    {opp.lead && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="truncate">{opp.lead.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-sm font-medium text-primary">
                      <DollarSign className="w-3.5 h-3.5" />
                      {Number(opp.value).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function OpportunitiesBoard() {
  const { data: opportunities, isLoading: oppLoading } = useOpportunities();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const moveOpportunity = useMoveOpportunity();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const opportunitiesByStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    stages?.forEach((stage) => {
      map[stage.id] = [];
    });
    opportunities?.forEach((opp) => {
      if (map[opp.stage_id]) {
        map[opp.stage_id].push(opp);
      }
    });
    return map;
  }, [opportunities, stages]);

  const handleMoveOpportunity = async (oppId: string, stageId: string) => {
    await moveOpportunity.mutateAsync({ id: oppId, stage_id: stageId });
  };

  const isLoading = oppLoading || stagesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground">Manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Pipeline Settings
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {!stages?.length ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Settings className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No pipeline stages</h2>
          <p className="text-muted-foreground mb-4">
            Configure your pipeline stages to start tracking opportunities.
          </p>
          <Button onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Configure Pipeline
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="flex gap-4 pb-4">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={opportunitiesByStage[stage.id] || []}
                onMoveOpportunity={handleMoveOpportunity}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
                draggedId={draggedId}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <CreateOpportunityDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <PipelineSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />
    </div>
  );
}
