import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  useOpportunitiesEnhanced, 
  useMoveOpportunityEnhanced,
  useCloseOpportunity 
} from "@/hooks/useOpportunitiesEnhanced";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useDealScores } from "@/hooks/useDealScores";
import { SavedView, useSavedViews } from "@/hooks/useSavedViews";
import { applyFilters, FilterCondition } from "@/hooks/useFilterEngine";
import { Opportunity } from "@/types/opportunity";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus, 
  Settings, 
  LayoutGrid, 
  List, 
  Search,
  Filter,
  ArrowUpDown,
  Flame,
  FileText,
} from "lucide-react";
import { OpportunityKPICards } from "./OpportunityKPICards";
import { PipelineSummaryBar } from "./PipelineSummaryBar";
import { OpportunityKanbanColumn } from "./OpportunityKanbanColumn";
import { OpportunityTableView } from "./OpportunityTableView";
import { CreateOpportunityEnhancedDialog } from "./CreateOpportunityEnhancedDialog";
import { PipelineSettingsDialog } from "@/components/crm/PipelineSettingsDialog";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { DealsSidebar } from "./DealsSidebar";
import { CreateViewDialog } from "./CreateViewDialog";
import { toast } from "sonner";
import { LayoutGroup } from "framer-motion";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useBulkDealIntelligenceAPI } from "@/hooks/useDealIntelligenceAPI";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
// Design System imports
import { PageLoading, EmptyState } from "@/components/design-system";

type ViewMode = "kanban" | "list";
type StatusFilter = "all" | "open" | "won" | "lost";


export function OpportunitiesModule() {
  const { t } = useTranslation('crm');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [wonOpportunity, setWonOpportunity] = useState<Opportunity | null>(null);
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [sortByScore, setSortByScore] = useState(false);
  const [hotDealsOnly, setHotDealsOnly] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreateViewDialog, setShowCreateViewDialog] = useState(false);

  const { data: opportunities, isLoading: oppLoading } = useOpportunitiesEnhanced({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const moveOpportunity = useMoveOpportunityEnhanced();
  const closeOpportunity = useCloseOpportunity();
  const { trackLeadMovedPipeline } = useCRMAnalytics();
  const { scoresMap } = useDealScores();
  const { scoresMap: healthMap } = useBulkDealIntelligenceAPI(opportunities);
  const { data: members } = useWorkspaceMembers();
  const { data: savedViews } = useSavedViews("opportunities");

  // Build owner profiles map from workspace members
  const membersMap = useMemo(() => {
    const map = new Map<string, typeof members extends (infer T)[] ? NonNullable<(T & { profile?: any })["profile"]> : never>();
    members?.forEach((m) => {
      if (m.profile) map.set(m.user_id, m.profile);
    });
    return map;
  }, [members]);

  // Filter by search + hotDeals
  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return [];
    let list = opportunities;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter((opp) =>
        opp.title.toLowerCase().includes(query) ||
        opp.lead?.name?.toLowerCase().includes(query) ||
        opp.contact?.name?.toLowerCase().includes(query) ||
        opp.company?.name?.toLowerCase().includes(query)
      );
    }

    if (hotDealsOnly) {
      list = list.filter((opp) => scoresMap.get(opp.id)?.category === "hot");
    }

    // Apply smart list filter conditions
    if (activeViewId && savedViews) {
      const activeView = savedViews.find((v) => v.id === activeViewId);
      if (activeView) {
        const f = activeView.filters as any;
        const conditions: FilterCondition[] = f?.conditions || [];
        if (conditions.length > 0) {
          list = applyFilters(list as unknown as Record<string, unknown>[], conditions, "AND") as unknown as typeof list;
        }
      }
    }

    if (sortByScore) {
      list = [...list].sort((a, b) => {
        const sa = scoresMap.get(a.id)?.close_score ?? -1;
        const sb = scoresMap.get(b.id)?.close_score ?? -1;
        return sb - sa;
      });
    }

    return list;
  }, [opportunities, searchQuery, hotDealsOnly, sortByScore, scoresMap, activeViewId, savedViews]);

  const hotCount = useMemo(
    () => (opportunities || []).filter(o => scoresMap.get(o.id)?.category === "hot").length,
    [opportunities, scoresMap]
  );

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
      const opp = opportunities?.find(o => o.id === oppId);
      const fromStage = stages?.find(s => s.id === opp?.stage_id);
      const toStage = stages?.find(s => s.id === stageId);
      
      await moveOpportunity.mutateAsync({ id: oppId, stage_id: stageId, probability });
      
      if (fromStage && toStage && opp) {
        const daysInPrevious = opp.updated_at 
          ? Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400000)
          : 0;
        trackLeadMovedPipeline({ from_stage: fromStage.name, to_stage: toStage.name, days_in_previous_stage: daysInPrevious });
      }
      
      toast.success(t('opportunityMoved'));
    } catch (error) {
      toast.error(t('errorMovingOpportunity'));
    }
  };

  const handleMarkAsWon = async (id: string) => {
    try {
      await closeOpportunity.mutateAsync({ id, status: "won" });
      toast.success(t('opportunityWon'));
      
      const opp = opportunities?.find(o => o.id === id);
      if (opp) {
        setWonOpportunity(opp);
        setShowInvoicePrompt(true);
      }
    } catch (error) {
      toast.error(t('errorUpdatingOpportunity'));
    }
  };

  const handleCreateInvoiceFromWon = () => {
    setShowInvoicePrompt(false);
    setShowInvoiceDialog(true);
  };

  const handleSkipInvoice = () => {
    setShowInvoicePrompt(false);
    setWonOpportunity(null);
  };

  const handleMarkAsLost = async (id: string) => {
    try {
      await closeOpportunity.mutateAsync({ id, status: "lost" });
      toast.success(t('opportunityLost'));
    } catch (error) {
      toast.error(t('errorUpdatingOpportunity'));
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

  const handleSelectView = useCallback((view: SavedView | null) => {
    setActiveViewId(view?.id ?? null);
    if (view?.view_mode === "list" || view?.view_mode === "kanban") {
      setViewMode(view.view_mode as ViewMode);
    }
  }, []);

  const isLoading = oppLoading || stagesLoading;

  if (isLoading) {
    return <PageLoading message={t('loadingOpportunities')} />;
  }

  return (
    <div className="flex h-full">
      <DealsSidebar
        activeViewId={activeViewId}
        onSelectView={handleSelectView}
        onCreateView={() => setShowCreateViewDialog(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        opportunities={opportunities}
      />
      <div className="flex-1 min-w-0 space-y-6 h-full flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('opportunitiesTitle')}</h1>
          <p className="text-muted-foreground">{t('opportunitiesDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            {t('pipelineSettings')}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('newOpportunity')}
          </Button>
        </div>
      </div>

      {/* Pipeline Summary Bar */}
      {stages && stages.length > 0 && opportunities && (
        <PipelineSummaryBar 
          opportunities={opportunities} 
          stages={stages} 
        />
      )}

      {/* KPIs */}
      <OpportunityKPICards />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('searchOpportunities')}
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
              <SelectItem value="all">{t('allStatusFilter')}</SelectItem>
              <SelectItem value="open">{t('openFilter')}</SelectItem>
              <SelectItem value="won">{t('wonFilter')}</SelectItem>
              <SelectItem value="lost">{t('lostFilter')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort by Score */}
          <Button
            variant={sortByScore ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setSortByScore((v) => !v)}
          >
            <ArrowUpDown className="w-4 h-4" />
            {t('score')}
          </Button>

          {/* Hot Deals filter */}
          <Button
            variant={hotDealsOnly ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setHotDealsOnly((v) => !v)}
          >
            <Flame className="w-4 h-4" />
            {t('hotDeals')}
            {hotCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                {hotCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              {t('kanban')}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              {t('list')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>


      {/* Main Content */}
      {!stages?.length ? (
        <EmptyState
          type="opportunities"
          title={t('noPipelineStages')}
          description={t('noPipelineStagesDesc')}
          action={{
            label: t('configurePipeline'),
            onClick: () => setIsSettingsDialogOpen(true),
          }}
        />
      ) : viewMode === "kanban" ? (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <LayoutGroup>
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
                onOpportunityClick={(opp) => navigate(`/dashboard/opportunities/${opp.id}`)}
                onCreateOpportunity={() => setIsCreateDialogOpen(true)}
                draggedId={draggedId}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
                scoresMap={scoresMap}
                healthMap={healthMap}
                allStages={stages as any}
                membersMap={membersMap as any}
              />
            ))}
          </div>
          </LayoutGroup>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="flex-1 min-h-0">
          <OpportunityTableView
            opportunities={filteredOpportunities}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onOpportunityClick={(opp) => navigate(`/dashboard/opportunities/${opp.id}`)}
            onMarkAsWon={handleMarkAsWon}
            onMarkAsLost={handleMarkAsLost}
            scoresMap={scoresMap}
            healthMap={healthMap}
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


      {/* Won Opportunity - Create Invoice Prompt */}
      <AlertDialog open={showInvoicePrompt} onOpenChange={setShowInvoicePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {t('createInvoiceTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('createInvoiceDesc', { title: wonOpportunity?.title })}
              {wonOpportunity?.value && (
                <span className="block mt-2">
                  {t('createInvoiceValue')} <strong>{new Intl.NumberFormat("pt-PT", { style: "currency", currency: wonOpportunity.currency || "EUR" }).format(Number(wonOpportunity.value))}</strong>
                </span>
              )}
              <span className="block mt-2">{t('createInvoicePrompt')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipInvoice}>{t('laterButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateInvoiceFromWon} className="bg-green-600 hover:bg-green-700">
              <FileText className="w-4 h-4 mr-2" />
              {t('createInvoice')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Dialog with pre-filled data from won opportunity */}
      <CreateInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={(open) => {
          setShowInvoiceDialog(open);
          if (!open) setWonOpportunity(null);
        }}
        defaultContactId={wonOpportunity?.contact_id || undefined}
        defaultCompanyId={wonOpportunity?.company_id || undefined}
        defaultOpportunityId={wonOpportunity?.id}
      />
      <CreateViewDialog
        open={showCreateViewDialog}
        onOpenChange={setShowCreateViewDialog}
        onCreated={(id) => setActiveViewId(id)}
      />
      </div>
    </div>
  );
}
