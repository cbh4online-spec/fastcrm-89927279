import { CheckCircle, Circle, XCircle } from "lucide-react";
import type { OrderNoteStatus } from "@/types/order-note";
import { cn } from "@/lib/utils";

interface OrderNoteStatusFlowProps {
  currentStatus: OrderNoteStatus;
  hasInstallmentRequest?: boolean;
}

interface StatusStep {
  key: OrderNoteStatus;
  label: string;
}

export function OrderNoteStatusFlow({
  currentStatus,
  hasInstallmentRequest,
}: OrderNoteStatusFlowProps) {
  // Define the flow based on whether installment was requested
  const normalFlow: StatusStep[] = [
    { key: "submitted", label: "Enviado" },
    { key: "approved", label: "Aprovado" },
    { key: "in_preparation", label: "Em Preparação" },
    { key: "invoiced", label: "Faturado" },
  ];

  const installmentFlow: StatusStep[] = [
    { key: "submitted", label: "Enviado" },
    { key: "awaiting_approval", label: "Aguardando Aprovação" },
    { key: "approved", label: "Aprovado" },
    { key: "in_preparation", label: "Em Preparação" },
    { key: "invoiced", label: "Faturado" },
  ];

  const flow = hasInstallmentRequest ? installmentFlow : normalFlow;

  // Determine status states
  const statusOrder = flow.map((s) => s.key);
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const isRejected = currentStatus === "rejected";

  const getStepState = (stepKey: OrderNoteStatus, index: number) => {
    if (isCancelled || isRejected) {
      return index < currentIndex ? "completed" : "inactive";
    }
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="py-4">
      {(isCancelled || isRejected) && (
        <div className={cn(
          "mb-4 p-3 rounded-lg flex items-center gap-2",
          isCancelled ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"
        )}>
          <XCircle className="h-5 w-5" />
          <span className="font-medium">
            {isCancelled ? "Encomenda Cancelada" : "Encomenda Rejeitada"}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {flow.map((step, index) => {
          const state = getStepState(step.key, index);
          const isLast = index === flow.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    state === "completed" && "bg-green-500 text-white",
                    state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    state === "upcoming" && "bg-muted text-muted-foreground",
                    state === "inactive" && "bg-muted text-muted-foreground opacity-50"
                  )}
                >
                  {state === "completed" ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center",
                    state === "current" && "text-primary",
                    state === "upcoming" && "text-muted-foreground",
                    state === "inactive" && "text-muted-foreground opacity-50"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    state === "completed" ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
