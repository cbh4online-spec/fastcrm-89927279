import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  MoreVertical,
  Target,
  CalendarClock,
  UserCheck,
  Zap,
} from "lucide-react";
import {
  useCheckAutomationsForAction,
  useUpdateConversationPriority,
  useUpdateLeadStatusFromInbox,
  useMarkConversationResolved,
} from "@/hooks/useInboxActions";
import { AutomationConfirmDialog } from "./AutomationConfirmDialog";
import { CreateOpportunityFromInboxDialog } from "./CreateOpportunityFromInboxDialog";
import { ScheduleFollowupDialog } from "./ScheduleFollowupDialog";
import { useNavigate } from "react-router-dom";

interface InboxActionsMenuProps {
  conversationId: string;
  leadId: string | null;
  leadName: string | null;
  currentPriority?: string | null;
  currentLeadStatus?: string | null;
}

export function InboxActionsMenu({
  conversationId,
  leadId,
  leadName,
  currentPriority,
  currentLeadStatus,
}: InboxActionsMenuProps) {
  const navigate = useNavigate();
  
  // Dialog states
  const [showPriorityConfirm, setShowPriorityConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Mutations
  const updatePriority = useUpdateConversationPriority();
  const updateLeadStatus = useUpdateLeadStatusFromInbox();
  const markResolved = useMarkConversationResolved();

  // Check automations
  const priorityAutomations = useCheckAutomationsForAction("mark_high_priority");
  const statusAutomations = useCheckAutomationsForAction("change_lead_status", {
    status: pendingStatus,
  });
  const resolveAutomations = useCheckAutomationsForAction("mark_resolved");

  const handleMarkHighPriority = () => {
    if (priorityAutomations.length > 0) {
      setShowPriorityConfirm(true);
    } else {
      executePriorityChange(false);
    }
  };

  const executePriorityChange = (
    triggerAutomation: boolean,
    automationId?: string
  ) => {
    updatePriority.mutate({
      conversationId,
      leadId,
      priority: "high",
      triggerAutomation,
      automationRuleId: automationId,
    });
  };

  const handleChangeLeadStatus = (status: string) => {
    if (!leadId) return;
    setPendingStatus(status);
    
    const automations = statusAutomations.filter((a) => {
      const statusCondition = a.conditions?.find(
        (c) => c.field_name === "status" && c.operator === "equals"
      );
      return !statusCondition || statusCondition.value === status;
    });

    if (automations.length > 0) {
      setShowStatusConfirm(true);
    } else {
      executeStatusChange(status, false);
    }
  };

  const executeStatusChange = (
    status: string,
    triggerAutomation: boolean,
    automationId?: string
  ) => {
    if (!leadId) return;
    updateLeadStatus.mutate({
      conversationId,
      leadId,
      status,
      triggerAutomation,
      automationRuleId: automationId,
    });
    setPendingStatus(null);
  };

  const handleMarkResolved = () => {
    if (resolveAutomations.length > 0) {
      setShowResolveConfirm(true);
    } else {
      executeResolve(false);
    }
  };

  const executeResolve = (
    triggerAutomation: boolean,
    automationId?: string
  ) => {
    markResolved.mutate({
      conversationId,
      leadId,
      triggerAutomation,
      automationRuleId: automationId,
    });
  };

  const handleSendProposal = () => {
    // Navigate to proposals page with lead context
    if (leadId) {
      navigate(`/dashboard/proposals?leadId=${leadId}`);
    } else {
      navigate("/dashboard/proposals");
    }
  };

  const hasLeadActions = !!leadId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MoreVertical className="w-4 h-4" />
            Ações
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Priority */}
          <DropdownMenuItem
            onClick={handleMarkHighPriority}
            disabled={currentPriority === "high"}
          >
            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
            <span className="flex-1">Marcar como Alta Prioridade</span>
            {priorityAutomations.length > 0 && (
              <Zap className="w-3 h-3 text-amber-500" />
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Lead Status */}
          {hasLeadActions && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserCheck className="w-4 h-4 mr-2" />
                Alterar Status do Lead
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => handleChangeLeadStatus("new")}
                  disabled={currentLeadStatus === "new"}
                >
                  Novo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeLeadStatus("in_progress")}
                  disabled={currentLeadStatus === "in_progress"}
                >
                  Em Progresso
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeLeadStatus("completed")}
                  disabled={currentLeadStatus === "completed"}
                >
                  Concluído
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* Create Opportunity */}
          {hasLeadActions && (
            <DropdownMenuItem onClick={() => setShowOpportunityDialog(true)}>
              <Target className="w-4 h-4 mr-2" />
              <span className="flex-1">Criar Oportunidade</span>
              {useCheckAutomationsForAction("create_opportunity").length > 0 && (
                <Zap className="w-3 h-3 text-amber-500" />
              )}
            </DropdownMenuItem>
          )}

          {/* Send Proposal */}
          <DropdownMenuItem onClick={handleSendProposal}>
            <FileText className="w-4 h-4 mr-2" />
            Enviar Proposta
          </DropdownMenuItem>

          {/* Schedule Follow-up */}
          {hasLeadActions && (
            <DropdownMenuItem onClick={() => setShowFollowupDialog(true)}>
              <CalendarClock className="w-4 h-4 mr-2" />
              Agendar Follow-up
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Mark Resolved */}
          <DropdownMenuItem onClick={handleMarkResolved}>
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            <span className="flex-1">Marcar como Resolvida</span>
            {resolveAutomations.length > 0 && (
              <Zap className="w-3 h-3 text-amber-500" />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Confirm Dialog */}
      <AutomationConfirmDialog
        open={showPriorityConfirm}
        onOpenChange={setShowPriorityConfirm}
        actionLabel="Marcar como Alta Prioridade"
        automations={priorityAutomations}
        onConfirm={executePriorityChange}
      />

      {/* Status Confirm Dialog */}
      <AutomationConfirmDialog
        open={showStatusConfirm}
        onOpenChange={setShowStatusConfirm}
        actionLabel="Alterar Status do Lead"
        automations={statusAutomations}
        onConfirm={(trigger, automationId) =>
          pendingStatus && executeStatusChange(pendingStatus, trigger, automationId)
        }
      />

      {/* Resolve Confirm Dialog */}
      <AutomationConfirmDialog
        open={showResolveConfirm}
        onOpenChange={setShowResolveConfirm}
        actionLabel="Marcar como Resolvida"
        automations={resolveAutomations}
        onConfirm={executeResolve}
      />

      {/* Create Opportunity Dialog */}
      {leadId && leadName && (
        <CreateOpportunityFromInboxDialog
          open={showOpportunityDialog}
          onOpenChange={setShowOpportunityDialog}
          conversationId={conversationId}
          leadId={leadId}
          leadName={leadName}
        />
      )}

      {/* Schedule Follow-up Dialog */}
      {leadId && leadName && (
        <ScheduleFollowupDialog
          open={showFollowupDialog}
          onOpenChange={setShowFollowupDialog}
          conversationId={conversationId}
          leadId={leadId}
          leadName={leadName}
        />
      )}
    </>
  );
}
