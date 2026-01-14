import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ChevronDown, 
  FileEdit, 
  Play, 
  Pause, 
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { 
  AutomationState, 
  AUTOMATION_STATE_CONFIG 
} from "@/lib/automationSafety";
import { useUpdateAutomationState } from "@/hooks/useAutomationSafety";

interface Props {
  ruleId: string;
  currentState: AutomationState;
  hasErrors?: boolean;
  compact?: boolean;
}

const stateIcons: Record<AutomationState, React.ReactNode> = {
  draft: <FileEdit className="h-3 w-3" />,
  active: <Play className="h-3 w-3" />,
  paused: <Pause className="h-3 w-3" />,
  error: <AlertTriangle className="h-3 w-3" />,
};

export function AutomationStateManager({ ruleId, currentState, hasErrors, compact }: Props) {
  const [confirmDialog, setConfirmDialog] = useState<AutomationState | null>(null);
  const updateState = useUpdateAutomationState();
  
  const config = AUTOMATION_STATE_CONFIG[currentState];

  const handleStateChange = (newState: AutomationState) => {
    if (newState === "active" && hasErrors) {
      // Show confirmation for activating with errors
      setConfirmDialog(newState);
      return;
    }
    
    if (newState === "active") {
      setConfirmDialog(newState);
      return;
    }
    
    updateState.mutate({ ruleId, state: newState });
  };

  const confirmStateChange = () => {
    if (confirmDialog) {
      updateState.mutate({ ruleId, state: confirmDialog });
      setConfirmDialog(null);
    }
  };

  if (compact) {
    return (
      <Badge className={`${config.bgColor} ${config.color} gap-1`}>
        {stateIcons[currentState]}
        {config.label}
      </Badge>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-2 ${config.bgColor} ${config.color} border-0`}
            disabled={updateState.isPending}
          >
            {stateIcons[currentState]}
            {config.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {currentState !== "draft" && (
            <DropdownMenuItem onClick={() => handleStateChange("draft")}>
              <FileEdit className="mr-2 h-4 w-4" />
              Mover para Rascunho
            </DropdownMenuItem>
          )}
          
          {currentState !== "active" && (
            <DropdownMenuItem onClick={() => handleStateChange("active")}>
              <Play className="mr-2 h-4 w-4" />
              Ativar
            </DropdownMenuItem>
          )}
          
          {currentState === "active" && (
            <DropdownMenuItem onClick={() => handleStateChange("paused")}>
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </DropdownMenuItem>
          )}
          
          {currentState === "paused" && (
            <DropdownMenuItem onClick={() => handleStateChange("active")}>
              <Play className="mr-2 h-4 w-4" />
              Retomar
            </DropdownMenuItem>
          )}
          
          {currentState === "error" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStateChange("active")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Reativar (resolver erro)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasErrors ? "Ativar automação com avisos?" : "Ativar automação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasErrors ? (
                <>
                  Esta automação tem avisos de configuração. Ao ativá-la, ela começará a 
                  executar automaticamente quando os gatilhos forem disparados.
                  <br /><br />
                  Certifique-se de que a configuração está correta antes de continuar.
                </>
              ) : (
                <>
                  Ao ativar esta automação, ela começará a executar automaticamente 
                  quando os gatilhos configurados forem disparados.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStateChange}>
              <Play className="mr-2 h-4 w-4" />
              Ativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
