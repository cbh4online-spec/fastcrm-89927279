import { useOpportunitiesModule } from "./module/useOpportunitiesModule";
import { OpportunitiesHeader } from "./module/OpportunitiesHeader";
import { OpportunitiesFiltersBar } from "./module/OpportunitiesFiltersBar";
import { OpportunitiesKanbanView } from "./module/OpportunitiesKanbanView";
import { OpportunitiesListView } from "./module/OpportunitiesListView";
import { OpportunitiesDialogs } from "./module/OpportunitiesDialogs";
import { OpportunityKPICards } from "./OpportunityKPICards";
import { CommandPalette } from "./CommandPalette";
import { PageLoading } from "@/components/design-system";
import { useTranslation } from "react-i18next";

export function OpportunitiesModule() {
  const { t } = useTranslation('crm');
  const state = useOpportunitiesModule();

  if (state.isLoading) {
    return <PageLoading message={t('loadingOpportunities')} />;
  }

  return (
    <div className="h-full">
      <CommandPalette
        open={state.commandPaletteOpen}
        onOpenChange={state.setCommandPaletteOpen}
        onSelectView={state.handleSelectView}
        onCreateDeal={() => state.setIsCreateDialogOpen(true)}
      />
      <div className="flex-1 min-w-0 space-y-6 h-full flex flex-col overflow-auto">
        <OpportunitiesHeader state={state} />
        <OpportunityKPICards />
        <OpportunitiesFiltersBar state={state} />

        {state.viewMode === "kanban" ? (
          <OpportunitiesKanbanView state={state} />
        ) : (
          <OpportunitiesListView state={state} />
        )}

        <OpportunitiesDialogs state={state} />
      </div>
    </div>
  );
}
