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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, AlertTriangle } from "lucide-react";
import { AutomationRule } from "@/hooks/useAutomations";

interface AutomationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  automations: AutomationRule[];
  onConfirm: (triggerAutomation: boolean, automationId?: string) => void;
}

export function AutomationConfirmDialog({
  open,
  onOpenChange,
  actionLabel,
  automations,
  onConfirm,
}: AutomationConfirmDialogProps) {
  const handleProceedWithAutomation = () => {
    onConfirm(true, automations[0]?.id);
    onOpenChange(false);
  };

  const handleProceedWithoutAutomation = () => {
    onConfirm(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Automação será acionada
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                A ação <strong>"{actionLabel}"</strong> irá acionar as seguintes automações:
              </p>
              
              <div className="space-y-2">
                {automations.map((automation) => (
                  <div
                    key={automation.id}
                    className="p-3 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">{automation.name}</span>
                    </div>
                    {automation.description && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6">
                        {automation.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <Badge variant="outline" className="text-xs">
                        {automation.actions?.length || 0} ações
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  As automações serão executadas imediatamente após confirmar.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleProceedWithoutAutomation}
            className="border-muted-foreground/30"
          >
            Prosseguir sem automação
          </Button>
          <AlertDialogAction onClick={handleProceedWithAutomation}>
            <Zap className="w-4 h-4 mr-2" />
            Prosseguir e acionar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
