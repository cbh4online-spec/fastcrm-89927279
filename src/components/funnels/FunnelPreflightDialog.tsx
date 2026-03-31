import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { type PreflightResult } from "@/utils/funnelPreflight";

interface FunnelPreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: PreflightResult | null;
  onConfirmPublish: () => void;
  isPending?: boolean;
}

export function FunnelPreflightDialog({ open, onOpenChange, result, onConfirmPublish, isPending }: FunnelPreflightDialogProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const scoreColor = result.score >= 80 ? "text-green-500" : result.score >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Verificação Pré-Publicação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Score */}
          <div className="text-center py-3">
            <span className={`text-4xl font-bold ${scoreColor}`}>{result.score}</span>
            <span className="text-lg text-muted-foreground">/100</span>
            <p className="text-xs text-muted-foreground mt-1">Score de completude</p>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
                <XCircle className="h-4 w-4" />
                Erros bloqueantes ({result.errors.length})
              </h4>
              {result.errors.map((e) => (
                <div key={e.code} className="flex items-start gap-2 text-sm pl-6">
                  <Badge variant="destructive" className="text-[10px] shrink-0">ERRO</Badge>
                  <span>{e.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                Avisos ({result.warnings.length})
              </h4>
              {result.warnings.map((w) => (
                <div key={w.code} className="flex items-start gap-2 text-sm pl-6">
                  <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500 text-amber-500">AVISO</Badge>
                  <span className="text-muted-foreground">{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* All good */}
          {result.errors.length === 0 && result.warnings.length === 0 && (
            <div className="text-center py-4 text-green-500">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
              <p className="font-medium">Tudo pronto para publicar!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={onConfirmPublish}
            disabled={hasErrors || isPending}
          >
            {hasErrors ? "Corrigir erros primeiro" : "Publicar Funil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
