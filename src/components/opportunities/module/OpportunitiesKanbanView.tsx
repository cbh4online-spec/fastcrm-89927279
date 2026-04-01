import { useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LayoutGroup } from "framer-motion";
import { OpportunityKanbanColumn } from "../OpportunityKanbanColumn";
import { EmptyState } from "@/components/design-system";
import { useTranslation } from "react-i18next";
import { OpportunitiesModuleState } from "./useOpportunitiesModule";

interface Props {
  state: OpportunitiesModuleState;
}

export function OpportunitiesKanbanView({ state }: Props) {
  const { t } = useTranslation('crm');
  const navigate = useNavigate();

  if (!state.stages?.length) {
    return (
      <EmptyState
        type="opportunities"
        title={t('noPipelineStages')}
        description={t('noPipelineStagesDesc')}
        action={{
          label: t('configurePipeline'),
          onClick: () => state.setIsSettingsDialogOpen(true),
        }}
      />
    );
  }

  return (
    <ScrollArea className="flex-1">
      <LayoutGroup>
        <div className="flex gap-4 pb-4">
          {state.stages.map((stage) => (
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
              opportunities={state.opportunitiesByStage[stage.id] || []}
              onMoveOpportunity={state.handleMoveOpportunity}
              onOpportunityClick={(opp) => navigate(`/dashboard/opportunities/${opp.id}`)}
              onCreateOpportunity={() => state.setIsCreateDialogOpen(true)}
              onEditOpportunity={(opp) => navigate(`/dashboard/opportunities/${opp.id}`)}
              onDeleteOpportunity={state.handleDeleteOpportunity}
              draggedId={state.draggedId}
              onDragStart={state.setDraggedId}
              onDragEnd={() => state.setDraggedId(null)}
              scoresMap={state.scoresMap}
              healthMap={state.healthMap}
              allStages={state.stages as any}
              membersMap={state.membersMap as any}
            />
          ))}
        </div>
      </LayoutGroup>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
