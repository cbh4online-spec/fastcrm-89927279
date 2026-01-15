import { useState, useMemo } from "react";
import { 
  useOpportunitiesEnhanced, 
  useMoveOpportunityEnhanced,
  useCloseOpportunity 
} from "@/hooks/useOpportunitiesEnhanced";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Opportunity } from "@/types/opportunity";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Settings, 
  LayoutGrid, 
  List, 
  Search,
  Filter,
  SlidersHorizontal
} from "lucide-react";
import { OpportunityKPICards } from "./OpportunityKPICards";
import { OpportunityKanbanColumn } from "./OpportunityKanbanColumn";
import { OpportunityTableView } from "./OpportunityTableView";
import { CreateOpportunityEnhancedDialog } from "./CreateOpportunityEnhancedDialog";
import { OpportunityDetailDialog } from "./OpportunityDetailDialog";
import { PipelineSettingsDialog } from "@/components/crm/PipelineSettingsDialog";
import { toast } from "sonner";

type ViewMode = "kanban" | "list";
type StatusFilter = "all" | "open" | "won" | "lost";

export function OpportunitiesModule() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: opportunities, isLoading: oppLoading } = useOpportunitiesEnhanced({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const moveOpportunity = useMoveOpportunityEnhanced();
  const closeOpportunity = useCloseOpportunity();

  // Filter by search
  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return [];
    if (!searchQuery) return opportunities;
    
    const query = searchQuery.toLowerCase();
    return opportunities.filter((opp) =>
      opp.title.toLowerCase().includes(query) ||
      opp.lead?.name?.toLowerCase().includes(query) ||
      opp.contact?.name?.toLowerCase().includes(query) ||
      opp.company?.name?.toLowerCase().includes(query)
    );
  }, [opportunities, searchQuery]);

  // Group by stage for Kanban
  const opportunitiesByStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    stages?.forEach((stage) => {
      map[stage.id] = [];
    });
    filteredOpportunities?.forEach((opp) => {
      if (map[opp.stage_id]) {
        map[opp.stage_id].push(opp);
      }
    });
    return map;
  }, [filteredOpportunities, stages]);

  const handleMoveOpportunity = async (oppId: string, stageId: string, probability: number) => {
    try {
      await moveOpportunity.mutateAsync({ id: oppId, stage_id: stageId, probability });
      toast.success("Oportunidade movida");
    } catch (error) {
      toast.error("Erro ao mover oportunidade");
    }
  };

  const handleMarkAsWon = async (id: string) => {
    try {
      await closeOpportunity.mutateAsync({ id, status: "won" });
      toast.success("Oportunidade marcada como ganha! 🎉");
    } catch (error) {
      toast.error("Erro ao atualizar oportunidade");
    }
  };

  const handleMarkAsLost = async (id: string) => {
    try {
      await closeOpportunity.mutateAsync({ id, status: "lost" });
      toast.success("Oportunidade marcada como perdida");
    } catch (error) {
      toast.error("Erro ao atualizar oportunidade");
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredOpportunities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOpportunities.map((o) => o.id));
    }
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
          <h1 className="text-2xl font-semibold text-foreground">Oportunidades</h1>
          <p className="text-muted-foreground">Gerencie o seu pipeline de vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Pipeline
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <OpportunityKPICards />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar oportunidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="open">Abertas</SelectItem>
              <SelectItem value="won">Ganhas</SelectItem>
              <SelectItem value="lost">Perdidas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      {!stages?.length ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <SlidersHorizontal className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sem etapas de pipeline</h2>
          <p className="text-muted-foreground mb-4">
            Configure as etapas do pipeline para começar a acompanhar oportunidades.
          </p>
          <Button onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Configurar Pipeline
          </Button>
        </div>
      ) : viewMode === "kanban" ? (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="flex gap-4 pb-4">
            {stages.map((stage) => (
              <OpportunityKanbanColumn
                key={stage.id}
                stage={{
                  ...stage,
                  workspace_id: stage.workspace_id,
                  pipeline_id: (stage as any).pipeline_id || null,
                  probability: (stage as any).probability || 50,
                  description: (stage as any).description || null,
                  created_at: stage.created_at,
                  updated_at: stage.updated_at,
                }}
                opportunities={opportunitiesByStage[stage.id] || []}
                onMoveOpportunity={handleMoveOpportunity}
                onOpportunityClick={setSelectedOpportunity}
                draggedId={draggedId}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="flex-1 min-h-0">
          <OpportunityTableView
            opportunities={filteredOpportunities}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onOpportunityClick={setSelectedOpportunity}
            onMarkAsWon={handleMarkAsWon}
            onMarkAsLost={handleMarkAsLost}
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateOpportunityEnhancedDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <PipelineSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />

      {selectedOpportunity && (
        <OpportunityDetailDialog
          opportunity={selectedOpportunity}
          open={!!selectedOpportunity}
          onOpenChange={(open) => !open && setSelectedOpportunity(null)}
          onMarkAsWon={() => handleMarkAsWon(selectedOpportunity.id)}
          onMarkAsLost={() => handleMarkAsLost(selectedOpportunity.id)}
        />
      )}
    </div>
  );
}
