import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { PreflightResult } from "@/utils/ebookPreflight";

interface EbookPreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: PreflightResult;
  onPublish: () => void;
  publishing?: boolean;
}

export function EbookPreflightDialog({ open, onOpenChange, result, onPublish, publishing }: EbookPreflightDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.canPublish ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Verificação pré-publicação
          </DialogTitle>
          <DialogDescription>
            Score de completude: <span className="font-semibold">{result.score}%</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {result.items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-sm py-1">
              {item.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : item.severity === "error" ? (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span className={item.passed ? "text-muted-foreground" : "text-foreground"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar ao editor
          </Button>
          {result.canPublish && result.warnings.length === 0 && (
            <Button onClick={onPublish} disabled={publishing}>
              {publishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Publicar
            </Button>
          )}
          {result.canPublish && result.warnings.length > 0 && (
            <Button onClick={onPublish} disabled={publishing} variant="default">
              {publishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Publicar mesmo assim
            </Button>
          )}
          {!result.canPublish && (
            <Button disabled variant="destructive">
              Corrigir erros primeiro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
