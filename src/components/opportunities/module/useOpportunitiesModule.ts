import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  useOpportunitiesEnhanced, 
  useMoveOpportunityEnhanced,
  useCloseOpportunity 
} from "@/hooks/useOpportunitiesEnhanced";
import { useDeleteOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useDealScores } from "@/hooks/useDealScores";
import { SavedView, useSavedViews, useUpdateSavedView, useDeleteSavedView } from "@/hooks/useSavedViews";
import { applyFilters, FilterCondition } from "@/hooks/useFilterEngine";
import { Opportunity } from "@/types/opportunity";
import { toast } from "sonner";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useBulkDealIntelligenceAPI } from "@/hooks/useDealIntelligenceAPI";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";

type ViewMode = "kanban" | "list";
type StatusFilter = "all" | "open" | "won" | "lost";

export interface OpportunitiesModuleState {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortByScore: boolean;
  setSortByScore: (v: boolean | ((prev: boolean) => boolean)) => void;
  hotDealsOnly: boolean;
  setHotDealsOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  activeViewId: string | null;
  setActiveViewId: (v: string | null) => void;
  selectedIds: string[];
  draggedId: string | null;
  setDraggedId: (v: string | null) => void;
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (v: boolean) => void;
  isSettingsDialogOpen: boolean;
  setIsSettingsDialogOpen: (v: boolean) => void;
  showCreateViewDialog: boolean;
  setShowCreateViewDialog: (v: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;
  wonOpportunity: Opportunity | null;
  showInvoicePrompt: boolean;
  setShowInvoicePrompt: (v: boolean) => void;
  showInvoiceDialog: boolean;
  setShowInvoiceDialog: (v: boolean) => void;
  // Data
  opportunities: Opportunity[] | undefined;
  stages: ReturnType<typeof usePipelineStages>["data"];
  isLoading: boolean;
  filteredOpportunities: Opportunity[];
  opportunitiesByStage: Record<string, Opportunity[]>;
  hotCount: number;
  scoresMap: ReturnType<typeof useDealScores>["scoresMap"];
  healthMap: any;
  membersMap: Map<string, any>;
  activeView: SavedView | null;
  activeViewConditions: FilterCondition[];
  savedViews: SavedView[] | undefined;
  // Handlers
  handleMoveOpportunity: (oppId: string, stageId: string, probability: number) => Promise<void>;
  handleMarkAsWon: (id: string) => Promise<void>;
  handleMarkAsLost: (id: string) => Promise<void>;
  handleCreateInvoiceFromWon: () => void;
  handleSkipInvoice: () => void;
  handleSelect: (id: string) => void;
  handleSelectAll: () => void;
  handleDeleteOpportunity: (opp: Opportunity) => Promise<void>;
  handleSelectView: (view: SavedView | null) => void;
  updateView: ReturnType<typeof useUpdateSavedView>;
  deleteViewMut: ReturnType<typeof useDeleteSavedView>;
  setWonOpportunity: (v: Opportunity | null) => void;
}

export function useOpportunitiesModule(): OpportunitiesModuleState {
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
  const [showCreateViewDialog, setShowCreateViewDialog] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { data: opportunities, isLoading: oppLoading } = useOpportunitiesEnhanced({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const moveOpportunity = useMoveOpportunityEnhanced();
  const closeOpportunity = useCloseOpportunity();
  const deleteOpportunity = useDeleteOpportunity();
  const { trackLeadMovedPipeline } = useCRMAnalytics();
  const { scoresMap } = useDealScores();
  const { scoresMap: healthMap } = useBulkDealIntelligenceAPI(opportunities);
  const { data: members } = useWorkspaceMembers();
  const { data: savedViews } = useSavedViews("opportunities");
  const updateView = useUpdateSavedView();
  const deleteViewMut = useDeleteSavedView();

  const activeView = useMemo(() => {
    if (!activeViewId || !savedViews) return null;
    return savedViews.find((v) => v.id === activeViewId) || null;
  }, [activeViewId, savedViews]);

  const activeViewConditions = useMemo(() => {
    if (!activeView) return [];
    const f = activeView.filters as any;
    return (f?.conditions as FilterCondition[]) || [];
  }, [activeView]);

  const membersMap = useMemo(() => {
    const map = new Map<string, any>();
    members?.forEach((m: any) => {
      if (m.profile) map.set(m.user_id, m.profile);
    });
    return map;
  }, [members]);

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

    if (activeViewId && savedViews) {
      const av = savedViews.find((v) => v.id === activeViewId);
      if (av) {
        const f = av.filters as any;
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

  const opportunitiesByStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    stages?.forEach((stage) => { map[stage.id] = []; });
    filteredOpportunities?.forEach((opp) => {
      if (map[opp.stage_id]) map[opp.stage_id].push(opp);
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
    } catch {
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
    } catch {
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
    } catch {
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

  const handleDeleteOpportunity = async (opp: Opportunity) => {
    try {
      await deleteOpportunity.mutateAsync(opp.id);
      toast.success(t('opportunityDeleted'));
    } catch {
      toast.error(t('errorDeletingOpportunity'));
    }
  };

  const handleSelectView = useCallback((view: SavedView | null) => {
    setActiveViewId(view?.id ?? null);
    if (view?.view_mode === "list" || view?.view_mode === "kanban") {
      setViewMode(view.view_mode as ViewMode);
    }
  }, []);

  return {
    viewMode, setViewMode,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    sortByScore, setSortByScore,
    hotDealsOnly, setHotDealsOnly,
    activeViewId, setActiveViewId,
    selectedIds,
    draggedId, setDraggedId,
    isCreateDialogOpen, setIsCreateDialogOpen,
    isSettingsDialogOpen, setIsSettingsDialogOpen,
    showCreateViewDialog, setShowCreateViewDialog,
    commandPaletteOpen, setCommandPaletteOpen,
    wonOpportunity, setWonOpportunity,
    showInvoicePrompt, setShowInvoicePrompt,
    showInvoiceDialog, setShowInvoiceDialog,
    opportunities, stages, isLoading: oppLoading || stagesLoading,
    filteredOpportunities, opportunitiesByStage, hotCount,
    scoresMap, healthMap, membersMap,
    activeView, activeViewConditions, savedViews,
    handleMoveOpportunity, handleMarkAsWon, handleMarkAsLost,
    handleCreateInvoiceFromWon, handleSkipInvoice,
    handleSelect, handleSelectAll, handleDeleteOpportunity, handleSelectView,
    updateView, deleteViewMut,
  };
}
