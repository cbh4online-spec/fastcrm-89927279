import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { orderNoteStatusConfig, type OrderNoteStatus } from "@/types/order-note";
import { 
  FileEdit, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Package, 
  Receipt,
  Ban
} from "lucide-react";

interface OrderTimelineProps {
  currentStatus: OrderNoteStatus;
  hasInstallmentRequest?: boolean;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
}

interface TimelineStep {
  status: OrderNoteStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  date?: string | null;
}

export function OrderTimeline({
  currentStatus,
  hasInstallmentRequest = false,
  submittedAt,
  approvedAt,
  rejectedAt,
  createdAt,
}: OrderTimelineProps) {
  // Define steps based on whether there's an installment request
  const steps: TimelineStep[] = hasInstallmentRequest
    ? [
        { status: "draft", label: "Rascunho", icon: FileEdit, date: createdAt },
        { status: "awaiting_approval", label: "Aguardando Aprovação", icon: Clock, date: submittedAt },
        { status: "approved", label: "Aprovado", icon: CheckCircle2, date: approvedAt },
        { status: "in_preparation", label: "Em Preparação", icon: Package },
        { status: "invoiced", label: "Faturado", icon: Receipt },
      ]
    : [
        { status: "draft", label: "Rascunho", icon: FileEdit, date: createdAt },
        { status: "submitted", label: "Enviado", icon: Send, date: submittedAt },
        { status: "in_preparation", label: "Em Preparação", icon: Package },
        { status: "invoiced", label: "Faturado", icon: Receipt },
      ];

  // Get the index of the current status
  const currentIndex = steps.findIndex((step) => step.status === currentStatus);
  
  // Handle special terminal states
  const isRejected = currentStatus === "rejected";
  const isCancelled = currentStatus === "cancelled";
  const isTerminal = isRejected || isCancelled;

  const getStepState = (index: number) => {
    if (isTerminal) {
      // For rejected/cancelled, show completed up to the failed point
      return index < currentIndex ? "completed" : index === currentIndex ? "terminal" : "pending";
    }
    
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "pending";
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Progresso da Encomenda</h4>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-muted" />
        
        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const state = getStepState(index);
            const Icon = step.icon;
            const config = orderNoteStatusConfig[step.status];

            return (
              <div key={step.status} className="flex items-start gap-4 relative">
                {/* Icon Circle */}
                <div
                  className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    state === "completed" && "bg-primary border-primary text-primary-foreground",
                    state === "current" && `${config.bgColor} border-primary`,
                    state === "pending" && "bg-background border-muted-foreground/30 text-muted-foreground/50",
                    state === "terminal" && "bg-destructive/10 border-destructive text-destructive"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1.5">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      state === "pending" && "text-muted-foreground/50"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.date && state !== "pending" && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(step.date), "d MMM yyyy, HH:mm", { locale: pt })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Terminal State (Rejected/Cancelled) */}
          {isTerminal && (
            <div className="flex items-start gap-4 relative">
              <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 bg-destructive border-destructive text-destructive-foreground">
                {isRejected ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <Ban className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 pt-1.5">
                <p className="font-medium text-sm text-destructive">
                  {isRejected ? "Rejeitado" : "Cancelado"}
                </p>
                {rejectedAt && isRejected && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(rejectedAt), "d MMM yyyy, HH:mm", { locale: pt })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
