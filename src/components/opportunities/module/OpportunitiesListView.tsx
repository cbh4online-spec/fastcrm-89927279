import { useNavigate } from "react-router-dom";
import { OpportunityTableView } from "../OpportunityTableView";
import { OpportunitiesModuleState } from "./useOpportunitiesModule";

interface Props {
  state: OpportunitiesModuleState;
}

export function OpportunitiesListView({ state }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0">
      <OpportunityTableView
        opportunities={state.filteredOpportunities}
        selectedIds={state.selectedIds}
        onSelect={state.handleSelect}
        onSelectAll={state.handleSelectAll}
        onOpportunityClick={(opp) => navigate(`/dashboard/opportunities/${opp.id}`)}
        onMarkAsWon={state.handleMarkAsWon}
        onMarkAsLost={state.handleMarkAsLost}
        scoresMap={state.scoresMap}
        healthMap={state.healthMap}
      />
    </div>
  );
}
