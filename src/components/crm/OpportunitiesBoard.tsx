import { useState, useMemo } from "react";
import { useOpportunities, useMoveOpportunity, Opportunity } from "@/hooks/useOpportunities";
import { usePipelineStages, PipelineStage } from "@/hooks/usePipelineStages";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, FilterGroup } from "@/components/common/FilterSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Settings, DollarSign, User, GripVertical, Kanban, List, PanelLeftClose, PanelLeft, RefreshCw, Flame, Thermometer, Snowflake, Target, TrendingUp, Clock, AlertTriangle } from "lucide-react";
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
          {totalValue.toLocaleString("pt-PT", {
            style: "currency",
            currency: "EUR",
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
                      {Number(opp.value).toLocaleString("pt-PT", {
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

// Filter groups for sidebar
const filterGroups: FilterGroup[] = [
  {
    id: "probability",
    label: "Probabilidade",
    icon: <Target className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "prob_high", label: "Alta (>70%)", icon: <Flame className="h-4 w-4 text-green-500" /> },
      { id: "prob_medium", label: "Média (30-70%)", icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
      { id: "prob_low", label: "Baixa (<30%)", icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
    ],
  },
  {
    id: "value",
    label: "Valor",
    icon: <DollarSign className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: "value_high", label: "> €50.000" },
      { id: "value_medium", label: "€10.000 - €50.000" },
      { id: "value_low", label: "< €10.000" },
    ],
  },
  {
    id: "timing",
    label: "Timing",
    icon: <Clock className="h-4 w-4" />,
    items: [
      { id: "timing_closing", label: "A fechar este mês" },
      { id: "timing_quarter", label: "Este trimestre" },
      { id: "timing_stale", label: "Paradas há +30 dias", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
    ],
  },
  {
    id: "owner",
    label: "Responsável",
    icon: <User className="h-4 w-4" />,
    items: [
      { id: "owner_me", label: "Minhas oportunidades" },
      { id: "owner_team", label: "Da minha equipa" },
      { id: "owner_unassigned", label: "Sem responsável" },
    ],
  },
];

// Page tabs
const pageTabs = [
  { id: "kanban", label: "Kanban", icon: <Kanban className="h-4 w-4" /> },
  { id: "list", label: "Lista", icon: <List className="h-4 w-4" /> },
];

// Sort options
const sortOptions = [
  { value: "value_desc", label: "Maior valor" },
  { value: "value_asc", label: "Menor valor" },
  { value: "created_desc", label: "Mais recentes" },
  { value: "closing_asc", label: "Fecho mais próximo" },
  { value: "probability_desc", label: "Maior probabilidade" },
];

export function OpportunitiesBoard() {
  const { data: opportunities, isLoading: oppLoading, refetch } = useOpportunities();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const moveOpportunity = useMoveOpportunity();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("value_desc");

  // Filter opportunities by search
  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return [];
    if (!searchValue) return opportunities;
    const lower = searchValue.toLowerCase();
    return opportunities.filter(opp => 
      opp.title?.toLowerCase().includes(lower) ||
      opp.lead?.name?.toLowerCase().includes(lower)
    );
  }, [opportunities, searchValue]);

  const opportunitiesByStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    stages?.forEach((stage) => {
      map[stage.id] = [];
    });
    filteredOpportunities.forEach((opp) => {
      if (map[opp.stage_id]) {
        map[opp.stage_id].push(opp);
      }
    });
    return map;
  }, [filteredOpportunities, stages]);

  const handleMoveOpportunity = async (oppId: string, stageId: string) => {
    await moveOpportunity.mutateAsync({ id: oppId, stage_id: stageId });
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId === activeFilterId ? undefined : filterId);
  };

  // Calculate totals
  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + Number(opp.value || 0), 0);
  const totalCount = filteredOpportunities.length;

  const isLoading = oppLoading || stagesLoading;
  const filtersActive = !!activeFilterId;

  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar */}
      <FilterSidebar
        filterGroups={filterGroups}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onClearFilter={() => setActiveFilterId(undefined)}
        isOpen={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Oportunidades"
          count={totalCount}
          description={`Pipeline: ${totalValue.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 })}`}
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
            {
              label: "Pipeline",
              icon: <Settings className="h-4 w-4" />,
              onClick: () => setIsSettingsDialogOpen(true),
              variant: "outline",
            },
            {
              label: "Nova Oportunidade",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => setIsCreateDialogOpen(true),
            },
          ]}
        />

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar oportunidades..."
          onSearchChange={setSearchValue}
          showFilters={true}
          filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={() => setActiveFilterId(undefined)}
          sortOptions={sortOptions}
          sortValue={sortValue}
          onSortChange={setSortValue}
          leftActions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterSidebar(!showFilterSidebar)}
              className="gap-2"
            >
              {showFilterSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          }
          rightActions={
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          }
          className="mt-4"
        />

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 mt-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stages?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-4">
            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sem etapas de pipeline</h2>
            <p className="text-muted-foreground mb-4">
              Configure as etapas do pipeline para começar a gerir oportunidades.
            </p>
            <Button onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Configurar Pipeline
            </Button>
          </div>
        ) : activeTab === "kanban" ? (
          <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
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
        ) : (
          <div className="flex-1 mt-4 rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Vista de lista em desenvolvimento</p>
          </div>
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
    </div>
  );
}
