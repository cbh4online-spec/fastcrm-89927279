import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { DealViewSelectorDropdown } from "../DealViewSelectorDropdown";
import { ViewSettingsDropdown } from "../ViewSettingsDropdown";
import { DealsImportExportMenu } from "../DealsImportExportMenu";
import { OpportunitiesModuleState } from "./useOpportunitiesModule";

interface Props {
  state: OpportunitiesModuleState;
}

export function OpportunitiesHeader({ state }: Props) {
  const { t } = useTranslation('crm');

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <DealViewSelectorDropdown
          activeViewId={state.activeViewId}
          onSelectView={state.handleSelectView}
          onCreateView={() => state.setShowCreateViewDialog(true)}
        />
      </div>
      <div className="flex items-center gap-2">
        <ViewSettingsDropdown
          activeView={state.activeView}
          onRename={(id, name) => state.updateView.mutate({ id, entity_type: "opportunities", updates: { name } })}
          onDelete={(id) => {
            state.deleteViewMut.mutate({ id, entity_type: "opportunities" });
            if (state.activeViewId === id) state.setActiveViewId(null);
          }}
        />
        <DealsImportExportMenu opportunities={state.filteredOpportunities} />
        <Button variant="outline" size="sm" onClick={() => state.setIsSettingsDialogOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          {t('pipelineSettings')}
        </Button>
        <Button onClick={() => state.setIsCreateDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          {t('newOpportunity')}
        </Button>
      </div>
    </div>
  );
}
