/**
 * Diálogo de enriquecimento em massa com AI Commerce.
 *
 * Mostra os produtos a processar, o progresso em tempo real e o resumo final.
 * Permite escolher entre preencher apenas campos vazios ou reescrever tudo.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Info, Loader2, Sparkles, X } from "lucide-react";
import {
  useBulkAICommerceEnrich,
  type BulkEnrichItem,
  type BulkEnrichTarget,
} from "@/hooks/useBulkAICommerceEnrich";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: BulkEnrichTarget[];
}

function StatusIcon({ status }: { status: BulkEnrichItem["status"] }) {
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />;
  if (status === "done") return <Check className="h-3.5 w-3.5 text-primary" aria-hidden />;
  if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />;
  if (status === "skipped") return <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
  return <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" aria-hidden />;
}

export function BulkAICommerceDialog({ open, onOpenChange, targets }: Props) {
  const bulk = useBulkAICommerceEnrich();
  const [overwrite, setOverwrite] = useState(false);
  const started = bulk.total > 0;

  useEffect(() => {
    if (!open && !bulk.running) bulk.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finished = started && !bulk.running;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && bulk.running) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Enriquecer com AI Commerce
          </DialogTitle>
          <DialogDescription>
            Gera título comercial, descrições, benefícios, funcionalidades, público-alvo, casos de uso, FAQ,
            palavras-chave e SEO para {targets.length} produto{targets.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertDescription className="text-sm">
            Os preços, stock e referências (GTIN/MPN) nunca são alterados — apenas o conteúdo descritivo.
          </AlertDescription>
        </Alert>

        {!started && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="bulk-overwrite" className="text-sm">
                Reescrever conteúdo existente
              </Label>
              <p className="text-xs text-muted-foreground">
                Desligado: preenche apenas os campos vazios, mantendo o que escreveu à mão.
              </p>
            </div>
            <Switch id="bulk-overwrite" checked={overwrite} onCheckedChange={setOverwrite} />
          </div>
        )}

        {started && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={bulk.progress} className="h-2" />
              <span className="w-16 text-right text-sm tabular-nums">
                {bulk.processed}/{bulk.total}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="default">{bulk.succeeded} concluídos</Badge>
              {bulk.failed > 0 && <Badge variant="destructive">{bulk.failed} com erro</Badge>}
            </div>
            <ScrollArea className="h-56 rounded-lg border">
              <ul className="divide-y">
                {bulk.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <StatusIcon status={item.status} />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.status === "done"
                        ? `${item.fieldsFilled ?? 0} campos`
                        : item.message || (item.status === "running" ? "a gerar…" : "")}
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          {bulk.running ? (
            <Button variant="outline" onClick={bulk.cancel}>
              Parar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
          {!finished && (
            <Button
              className="gap-2"
              disabled={bulk.running || targets.length === 0}
              onClick={() => bulk.start(targets, { overwrite, enableAICommerce: true })}
            >
              {bulk.running ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {started ? "A processar…" : `Enriquecer ${targets.length} produto${targets.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
