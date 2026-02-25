import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OpportunityRecordNavProps {
  opportunityId: string;
  stageId: string;
  stageName: string;
}

export function OpportunityRecordNav({ opportunityId, stageId, stageName }: OpportunityRecordNavProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  const { data: stageIds = [] } = useQuery({
    queryKey: ["stage-opportunity-ids", stageId, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await workspaceClient
        .from("opportunities")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("stage_id", stageId)
        .eq("status", "open")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(d => d.id);
    },
    enabled: !!currentWorkspace && !!stageId,
    staleTime: 30000,
  });

  const currentIndex = stageIds.indexOf(opportunityId);
  const total = stageIds.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const goTo = (index: number) => {
    const id = stageIds[index];
    if (id) navigate(`/dashboard/opportunities/${id}`);
  };

  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={!hasPrev}
        onClick={() => goTo(currentIndex - 1)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="whitespace-nowrap">
        {currentIndex + 1} {t("oppDetail_ofRecords")} {total} {t("oppDetail_inStage")} {stageName}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={!hasNext}
        onClick={() => goTo(currentIndex + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
