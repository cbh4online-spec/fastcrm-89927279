import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useContacts } from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import {
  useCrmViews,
  CrmEntityType,
  CrmViewMode,
  ROLE_DEFAULT_VIEWS,
  CONTACT_COLUMNS,
  OPPORTUNITY_COLUMNS,
  getDefaultColumnsForRole,
} from "@/hooks/useCrmViews";
import { CrmHeader } from "./unified/CrmHeader";
import { CrmTableView } from "./unified/CrmTableView";
import { CrmBoardView } from "./unified/CrmBoardView";
import { SaveViewDialog } from "./unified/SaveViewDialog";
import { ViewSelectorPopover } from "./unified/ViewSelectorPopover";
import { QuickTaskDialog } from "./unified/QuickTaskDialog";
import { CrmFilters } from "./unified/CrmAdvancedFilters";
import { toast } from "sonner";

export function UnifiedCrmView() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { contacts, isLoading: contactsLoading, deleteContact, deleteContacts, addTagsToContacts } = useContacts();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { data: stages } = usePipelineStages();
  const { views, isLoading: viewsLoading, getDefaultView, createView, updateView, deleteView, setAsDefault, getUserViews } = useCrmViews();

  // Get role-based defaults
  const userRole = currentWorkspace?.role || "viewer";
  const roleConfig = ROLE_DEFAULT_VIEWS[userRole];

  // State
  const [entityType, setEntityType] = useState<CrmEntityType>(roleConfig.entity);
  const [viewMode, setViewMode] = useState<CrmViewMode>(roleConfig.mode);
  const [searchQuery, setSearchQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<CrmFilters>({});
  const [viewFilters, setViewFilters] = useState<Record<string, unknown>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    getDefaultColumnsForRole(userRole, roleConfig.entity)
  );
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewSelectorOpen, setViewSelectorOpen] = useState(false);
  
  // Quick action dialogs
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickActionTarget, setQuickActionTarget] = useState<{ id: string; type: CrmEntityType } | null>(null);

  // Load default view on mount based on entity type
  const loadDefaultView = useCallback((entity: CrmEntityType) => {
    const defaultView = getDefaultView(entity);
    if (defaultView) {
      setViewMode(defaultView.view_mode);
      setViewFilters(defaultView.filters);
      setVisibleColumns(defaultView.visible_columns.length > 0 ? defaultView.visible_columns : 
        getDefaultColumnsForRole(userRole, entity));
      setSelectedViewId(defaultView.id);
    } else {
      // Use role defaults
      const roleDefault = ROLE_DEFAULT_VIEWS[userRole];
      if (roleDefault && roleDefault.entity === entity) {
        setViewMode(roleDefault.mode);
      } else {
        setViewMode("table");
      }
      setVisibleColumns(getDefaultColumnsForRole(userRole, entity));
      setSelectedViewId(null);
    }
    setViewFilters({});
    setAdvancedFilters({});
    setSearchQuery("");
  }, [getDefaultView, userRole]);

  // Handle entity toggle
  const handleEntityChange = useCallback((newEntity: CrmEntityType) => {
    setEntityType(newEntity);
    loadDefaultView(newEntity);
  }, [loadDefaultView]);

  // Apply a saved view
  const applyView = useCallback((viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (view) {
      setEntityType(view.entity_type);
      setViewMode(view.view_mode);
      setViewFilters(view.filters);
      setVisibleColumns(view.visible_columns.length > 0 ? view.visible_columns : 
        getDefaultColumnsForRole(userRole, view.entity_type));
      setSelectedViewId(viewId);
    }
  }, [views, userRole]);

  // Get available tags from contacts
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [contacts]);

  // Filter data with advanced filters
  const filteredContacts = useMemo(() => {
    if (entityType !== "contacts") return [];
    return contacts.filter((contact) => {
      // Text search
      const query = searchQuery.toLowerCase();
      const companyName = contact.company?.toLowerCase() || "";
      const matchesSearch = 
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        companyName.includes(query) ||
        contact.phone?.includes(query);
      
      if (!matchesSearch) return false;

      // Status filter
      if (advancedFilters.status) {
        // Contacts don't have a built-in status, so we skip this for now
        // Could be extended with custom fields
      }

      // Tags filter
      if (advancedFilters.tags && advancedFilters.tags.length > 0) {
        const contactTags = contact.tags || [];
        if (!advancedFilters.tags.some(t => contactTags.includes(t))) return false;
      }

      // Date filter
      if (advancedFilters.dateFrom) {
        const createdAt = new Date(contact.created_at);
        if (createdAt < advancedFilters.dateFrom) return false;
      }
      if (advancedFilters.dateTo) {
        const createdAt = new Date(contact.created_at);
        if (createdAt > advancedFilters.dateTo) return false;
      }

      return true;
    });
  }, [contacts, searchQuery, entityType, advancedFilters]);

  const filteredOpportunities = useMemo(() => {
    if (entityType !== "opportunities") return [];
    return (opportunities || []).filter((opp) => {
      // Text search
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        opp.title.toLowerCase().includes(query) ||
        opp.lead?.name.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;

      // Stage filter
      if (advancedFilters.stage && opp.stage_id !== advancedFilters.stage) return false;

      // Value range filter
      if (advancedFilters.valueMin !== undefined && (opp.value || 0) < advancedFilters.valueMin) return false;
      if (advancedFilters.valueMax !== undefined && (opp.value || 0) > advancedFilters.valueMax) return false;

      // Date filter
      if (advancedFilters.dateFrom) {
        const createdAt = new Date(opp.created_at);
        if (createdAt < advancedFilters.dateFrom) return false;
      }
      if (advancedFilters.dateTo) {
        const createdAt = new Date(opp.created_at);
        if (createdAt > advancedFilters.dateTo) return false;
      }

      return true;
    });
  }, [opportunities, searchQuery, entityType, advancedFilters]);

  // Get column definitions
  const columns = entityType === "contacts" ? CONTACT_COLUMNS : OPPORTUNITY_COLUMNS;

  // Loading state
  const isLoading = contactsLoading || opportunitiesLoading || viewsLoading;

  // Handle row click
  const handleRowClick = (id: string) => {
    if (entityType === "contacts") {
      navigate(`/dashboard/contacts/${id}`);
    } else {
      navigate(`/dashboard/opportunities`);
    }
  };

  // Handle quick actions
  const handleQuickAction = (action: "reply" | "task" | "opportunity", entityId: string, entityType: CrmEntityType) => {
    setQuickActionTarget({ id: entityId, type: entityType });
    
    if (action === "task") {
      setQuickTaskOpen(true);
    } else if (action === "reply") {
      toast.info("Funcionalidade de mensagem em desenvolvimento");
    } else if (action === "opportunity") {
      navigate(`/dashboard/opportunities`);
    }
  };

  // Handle save view
  const handleSaveView = async (name: string, isDefault: boolean) => {
    await createView.mutateAsync({
      name,
      entity_type: entityType,
      view_mode: viewMode,
      filters: { ...viewFilters, ...advancedFilters },
      visible_columns: visibleColumns,
      is_default: isDefault,
    });
    setSaveDialogOpen(false);
  };

  // Handle update current view
  const handleUpdateCurrentView = async () => {
    if (!selectedViewId) return;
    await updateView.mutateAsync({
      id: selectedViewId,
      filters: { ...viewFilters, ...advancedFilters },
      visible_columns: visibleColumns,
      view_mode: viewMode,
    });
  };

  // Check if current settings differ from selected view
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedViewId) return false;
    const view = views.find(v => v.id === selectedViewId);
    if (!view) return false;
    const currentFilters = { ...viewFilters, ...advancedFilters };
    return (
      view.view_mode !== viewMode ||
      JSON.stringify(view.filters) !== JSON.stringify(currentFilters) ||
      JSON.stringify(view.visible_columns) !== JSON.stringify(visibleColumns)
    );
  }, [selectedViewId, views, viewMode, viewFilters, advancedFilters, visibleColumns]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <CrmHeader
        entityType={entityType}
        viewMode={viewMode}
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        columns={columns}
        selectedViewId={selectedViewId}
        hasUnsavedChanges={hasUnsavedChanges}
        filters={advancedFilters}
        stages={stages?.map(s => ({ id: s.id, name: s.name })) || []}
        availableTags={availableTags}
        onEntityChange={handleEntityChange}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchQuery}
        onColumnsChange={setVisibleColumns}
        onFiltersChange={setAdvancedFilters}
        onSaveView={() => setSaveDialogOpen(true)}
        onUpdateView={handleUpdateCurrentView}
        onOpenViewSelector={() => setViewSelectorOpen(true)}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : viewMode === "table" ? (
          <CrmTableView
            entityType={entityType}
            contacts={filteredContacts}
            opportunities={filteredOpportunities}
            stages={stages || []}
            visibleColumns={visibleColumns}
            onRowClick={handleRowClick}
            onDeleteContact={(id) => deleteContact.mutateAsync(id)}
            onDeleteContacts={(ids) => deleteContacts.mutateAsync(ids)}
            onAddTagsToContacts={(ids, tags) => addTagsToContacts.mutateAsync({ ids, tags })}
          />
        ) : (
          <CrmBoardView
            entityType={entityType}
            contacts={filteredContacts}
            opportunities={filteredOpportunities}
            stages={stages || []}
            onRowClick={handleRowClick}
            onQuickAction={handleQuickAction}
          />
        )}
      </div>

      {/* Dialogs */}
      <SaveViewDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveView}
        isLoading={createView.isPending}
      />

      <ViewSelectorPopover
        open={viewSelectorOpen}
        onOpenChange={setViewSelectorOpen}
        views={getUserViews()}
        selectedViewId={selectedViewId}
        onSelectView={applyView}
        onSetDefault={(id) => setAsDefault.mutateAsync({ id, entityType })}
        onDeleteView={(id) => deleteView.mutateAsync(id)}
      />

      <QuickTaskDialog
        open={quickTaskOpen}
        onOpenChange={setQuickTaskOpen}
        relatedId={quickActionTarget?.id || ""}
        relatedType={quickActionTarget?.type === "contacts" ? "lead" : "opportunity"}
      />
    </div>
  );
}
