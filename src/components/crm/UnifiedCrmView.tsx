import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import {
  useCrmViews,
  CrmEntityType,
  CrmViewMode,
  ROLE_DEFAULT_VIEWS,
  CONTACT_COLUMNS,
  OPPORTUNITY_COLUMNS,
  DEFAULT_CONTACT_COLUMNS,
  DEFAULT_OPPORTUNITY_COLUMNS,
} from "@/hooks/useCrmViews";
import { CrmHeader } from "./unified/CrmHeader";
import { CrmTableView } from "./unified/CrmTableView";
import { CrmBoardView } from "./unified/CrmBoardView";
import { SaveViewDialog } from "./unified/SaveViewDialog";
import { ViewSelectorPopover } from "./unified/ViewSelectorPopover";

export function UnifiedCrmView() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { contacts, isLoading: contactsLoading, deleteContact } = useContacts();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const { data: stages } = usePipelineStages();
  const { views, isLoading: viewsLoading, getDefaultView, createView, updateView, deleteView, setAsDefault, getUserViews } = useCrmViews();

  // Get role-based defaults
  const roleDefaults = currentWorkspace?.role ? ROLE_DEFAULT_VIEWS[currentWorkspace.role] : { entity: "contacts" as CrmEntityType, mode: "table" as CrmViewMode };

  // State
  const [entityType, setEntityType] = useState<CrmEntityType>(roleDefaults.entity);
  const [viewMode, setViewMode] = useState<CrmViewMode>(roleDefaults.mode);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    entityType === "contacts" ? DEFAULT_CONTACT_COLUMNS : DEFAULT_OPPORTUNITY_COLUMNS
  );
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewSelectorOpen, setViewSelectorOpen] = useState(false);

  // Load default view on mount based on entity type
  const loadDefaultView = useCallback((entity: CrmEntityType) => {
    const defaultView = getDefaultView(entity);
    if (defaultView) {
      setViewMode(defaultView.view_mode);
      setFilters(defaultView.filters);
      setVisibleColumns(defaultView.visible_columns.length > 0 ? defaultView.visible_columns : 
        (entity === "contacts" ? DEFAULT_CONTACT_COLUMNS : DEFAULT_OPPORTUNITY_COLUMNS));
      setSelectedViewId(defaultView.id);
    } else {
      // Use role defaults
      const roleDefault = currentWorkspace?.role ? ROLE_DEFAULT_VIEWS[currentWorkspace.role] : null;
      if (roleDefault && roleDefault.entity === entity) {
        setViewMode(roleDefault.mode);
      } else {
        setViewMode("table");
      }
      setVisibleColumns(entity === "contacts" ? DEFAULT_CONTACT_COLUMNS : DEFAULT_OPPORTUNITY_COLUMNS);
      setSelectedViewId(null);
    }
    setFilters({});
    setSearchQuery("");
  }, [getDefaultView, currentWorkspace?.role]);

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
      setFilters(view.filters);
      setVisibleColumns(view.visible_columns.length > 0 ? view.visible_columns : 
        (view.entity_type === "contacts" ? DEFAULT_CONTACT_COLUMNS : DEFAULT_OPPORTUNITY_COLUMNS));
      setSelectedViewId(viewId);
    }
  }, [views]);

  // Filter data
  const filteredContacts = useMemo(() => {
    if (entityType !== "contacts") return [];
    return contacts.filter((contact) => {
      const query = searchQuery.toLowerCase();
      const companyName = contact.company?.toLowerCase() || "";
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        companyName.includes(query) ||
        contact.phone?.includes(query)
      );
    });
  }, [contacts, searchQuery, entityType]);

  const filteredOpportunities = useMemo(() => {
    if (entityType !== "opportunities") return [];
    return (opportunities || []).filter((opp) => {
      const query = searchQuery.toLowerCase();
      return (
        opp.title.toLowerCase().includes(query) ||
        opp.lead?.name.toLowerCase().includes(query)
      );
    });
  }, [opportunities, searchQuery, entityType]);

  // Get column definitions
  const columns = entityType === "contacts" ? CONTACT_COLUMNS : OPPORTUNITY_COLUMNS;

  // Loading state
  const isLoading = contactsLoading || opportunitiesLoading || viewsLoading;

  // Handle row click
  const handleRowClick = (id: string) => {
    if (entityType === "contacts") {
      navigate(`/dashboard/contacts/${id}`);
    } else {
      // For opportunities, we could navigate to a detail page when it exists
      navigate(`/dashboard/opportunities`);
    }
  };

  // Handle save view
  const handleSaveView = async (name: string, isDefault: boolean) => {
    await createView.mutateAsync({
      name,
      entity_type: entityType,
      view_mode: viewMode,
      filters,
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
      filters,
      visible_columns: visibleColumns,
      view_mode: viewMode,
    });
  };

  // Check if current settings differ from selected view
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedViewId) return false;
    const view = views.find(v => v.id === selectedViewId);
    if (!view) return false;
    return (
      view.view_mode !== viewMode ||
      JSON.stringify(view.filters) !== JSON.stringify(filters) ||
      JSON.stringify(view.visible_columns) !== JSON.stringify(visibleColumns)
    );
  }, [selectedViewId, views, viewMode, filters, visibleColumns]);

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
        onEntityChange={handleEntityChange}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchQuery}
        onColumnsChange={setVisibleColumns}
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
          />
        ) : (
          <CrmBoardView
            entityType={entityType}
            contacts={filteredContacts}
            opportunities={filteredOpportunities}
            stages={stages || []}
            onRowClick={handleRowClick}
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
    </div>
  );
}
