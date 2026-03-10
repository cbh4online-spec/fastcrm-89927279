import { CheckCircle, Circle, ArrowRight, MessageSquare, Target, FileText, Briefcase, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PipelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "upcoming";
  id?: string | null;
  route?: string;
}

interface SecurityPipelineStepperProps {
  currentStage: "request" | "lead" | "proposal" | "contract" | "installation";
  requestId?: string | null;
  leadId?: string | null;
  proposalId?: string | null;
  contractId?: string | null;
  systemId?: string | null;
  /** If lead is lost / proposal rejected */
  isFailed?: boolean;
}

const stageOrder = ["request", "lead", "proposal", "contract", "installation"] as const;

export function SecurityPipelineStepper({
  currentStage,
  requestId,
  leadId,
  proposalId,
  contractId,
  systemId,
  isFailed,
}: SecurityPipelineStepperProps) {
  const navigate = useNavigate();
  const currentIdx = stageOrder.indexOf(currentStage);

  const steps: PipelineStep[] = [
    {
      key: "request",
      label: "Pedido",
      icon: <MessageSquare className="h-4 w-4" />,
      status: getStatus(0, currentIdx, !!requestId),
      id: requestId,
      route: requestId ? `/dashboard/security/partner-requests/${requestId}` : undefined,
    },
    {
      key: "lead",
      label: "Lead",
      icon: <Target className="h-4 w-4" />,
      status: getStatus(1, currentIdx, !!leadId),
      id: leadId,
      route: leadId ? `/dashboard/security/leads/${leadId}` : undefined,
    },
    {
      key: "proposal",
      label: "Proposta",
      icon: <FileText className="h-4 w-4" />,
      status: getStatus(2, currentIdx, !!proposalId),
      id: proposalId,
      route: proposalId ? `/dashboard/security/proposals/${proposalId}` : undefined,
    },
    {
      key: "contract",
      label: "Contrato",
      icon: <Briefcase className="h-4 w-4" />,
      status: getStatus(3, currentIdx, !!contractId),
      id: contractId,
      route: contractId ? `/dashboard/security/contracts/${contractId}` : undefined,
    },
    {
      key: "installation",
      label: "Instalação",
      icon: <Wrench className="h-4 w-4" />,
      status: getStatus(4, currentIdx, !!systemId),
      id: systemId,
      route: systemId ? `/dashboard/security/systems/${systemId}` : undefined,
    },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((step, i) => {
        const isClickable = step.id && step.key !== currentStage;
        const isCurrent = step.key === currentStage;

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <ArrowRight className={cn(
                "h-3 w-3 mx-1 flex-shrink-0",
                step.status === "completed" || isCurrent ? "text-primary" : "text-muted-foreground/30"
              )} />
            )}
            <button
              onClick={() => isClickable && step.route && navigate(step.route)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                isCurrent && !isFailed && "bg-primary text-primary-foreground shadow-sm",
                isCurrent && isFailed && "bg-destructive text-destructive-foreground shadow-sm",
                step.status === "completed" && "bg-primary/10 text-primary hover:bg-primary/20",
                step.status === "upcoming" && "bg-muted text-muted-foreground",
                isClickable && "cursor-pointer",
                !isClickable && "cursor-default"
              )}
            >
              {step.status === "completed" ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : isCurrent ? (
                step.icon
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function getStatus(stepIdx: number, currentIdx: number, hasId: boolean): "completed" | "current" | "upcoming" {
  if (stepIdx === currentIdx) return "current";
  if (stepIdx < currentIdx || hasId) return "completed";
  return "upcoming";
}
