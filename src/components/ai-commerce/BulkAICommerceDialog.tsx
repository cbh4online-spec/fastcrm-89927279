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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Info, Loader2, Sparkles, X } from "lucide-react";
import {
  useBulkAICommerceEnrich,
  type BulkEnrichItem,
  type BulkEnrichTarget,
} from "@/hooks/useBulkAICommerceEnrich";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

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
  const [forceReenrich, setForceReenrich] = useState(false);
  const started = bulk.total > 0;

  const ids = targets.map((t) => t.id);
  const { data: enrichedMap = {}, isLoading: checking } = useQuery({
    queryKey: ["ai-commerce-enriched-status", ids],
    enabled: open && ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase
          .from("product_ai_commerce")
          .select("product_id, ai_last_validation")
          .in("product_id", ids.slice(i, i + 200))
          .not("ai_last_validation", "is", null);
        if (error) throw error;
        for (const row of data ?? []) {
          if (row.product_id && row.ai_last_validation) map[row.product_id] = row.ai_last_validation;
        }
      }
      return map;
    },
  });

  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { data: catalogPending = [], isLoading: checkingCatalog } = useQuery({
    queryKey: ["ai-commerce-catalog-pending", wsId],
    enabled: open && !!wsId,
    staleTime: 30_000,
    queryFn: async (): Promise<BulkEnrichTarget[]> => {
      const all: BulkEnrichTarget[] = [];
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku")
          .eq("workspace_id", wsId!)
          .range(from, from + 999);
        if (error) throw error;
        all.push(...((data ?? []) as BulkEnrichTarget[]));
        if (!data || data.length < 1000) break;
      }
      const done = new Set<string>();
      const allIds = all.map((p) => p.id);
      for (let i = 0; i < allIds.length; i += 200) {
        const { data, error } = await supabase
          .from("product_ai_commerce")
          .select("product_id")
          .eq("workspace_id", wsId!)
          .in("product_id", allIds.slice(i, i + 200))
          .not("ai_last_validation", "is", null);
        if (error) throw error;
        for (const r of data ?? []) if (r.product_id) done.add(r.product_id);
      }
      return all.filter((p) => !done.has(p.id));
    },
  });

  const enrichedCount = targets.filter((t) => enrichedMap[t.id]).length;
  const pendingCount = targets.length - enrichedCount;
  const toProcess = forceReenrich ? targets.length : pendingCount;

  useEffect(() => {
    if (!open && !bulk.running) {
      bulk.reset();
      setForceReenrich(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finished = started && !bulk.running;
  const skippedCount = bulk.items.filter((i) => i.status === "skipped").length;

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
          <div className="space-y-3 rounded-lg border p-4">
            {checking ? (
              <p className="text-sm text-muted-foreground">A verificar o que já foi feito…</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  {pendingCount === 0
                    ? `Tudo feito: os ${targets.length} produtos selecionados já têm ficha AI Commerce.`
                    : enrichedCount === 0
                      ? `Nenhum dos ${targets.length} produtos selecionados tem ficha AI Commerce.`
                      : `${pendingCount} por fazer · ${enrichedCount} já feitos (de ${targets.length} selecionados)`}
                </p>
                {pendingCount === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {checkingCatalog
                      ? "A procurar produtos em falta no resto do catálogo…"
                      : catalogPending.length > 0
                        ? `Há ${catalogPending.length} produto${catalogPending.length === 1 ? "" : "s"} em falta noutras páginas do catálogo. Pode tratá-los já com o botão abaixo.`
                        : "Todo o catálogo já tem ficha AI Commerce. Se quiser, escolha abaixo voltar a gerar estes."}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {!started && !checking && (
          <RadioGroup
            value={forceReenrich ? "regen" : "fill"}
            onValueChange={(v) => {
              const regen = v === "regen";
              setForceReenrich(regen);
              setOverwrite(regen);
            }}
            className="space-y-2"
          >
            <Label htmlFor="mode-fill" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
              <RadioGroupItem id="mode-fill" value="fill" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Só os que faltam</span>
                <span className="block text-xs text-muted-foreground">
                  Trata apenas os {pendingCount} por fazer e preenche só campos vazios. Mantém o que escreveu à mão.
                </span>
              </span>
            </Label>
            <Label htmlFor="mode-regen" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
              <RadioGroupItem id="mode-regen" value="regen" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Voltar a gerar tudo</span>
                <span className="block text-xs text-muted-foreground">
                  Refaz os {targets.length} selecionados e substitui textos existentes. Gasta mais créditos de IA.
                </span>
              </span>
            </Label>
          </RadioGroup>
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
              {skippedCount > 0 && <Badge variant="secondary">{skippedCount} ignorados</Badge>}
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
          {!finished && !started && !checking && !forceReenrich && pendingCount === 0 && catalogPending.length > 0 && (
            <Button
              className="gap-2"
              onClick={() =>
                bulk.start(catalogPending, { overwrite: false, enableAICommerce: true, alreadyEnriched: {}, forceReenrich: false })
              }
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {`Enriquecer os ${catalogPending.length} em falta do catálogo`}
            </Button>
          )}
          {!finished && !(!started && !checking && !forceReenrich && pendingCount === 0 && catalogPending.length > 0) && (
            <Button
              className="gap-2"
              disabled={bulk.running || checking || toProcess === 0}
              onClick={() =>
                bulk.start(
                  forceReenrich ? targets : targets.filter((t) => !enrichedMap[t.id]),
                  { overwrite, enableAICommerce: true, alreadyEnriched: enrichedMap, forceReenrich },
                )
              }
            >
              {bulk.running || checking ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {started
                ? "A processar…"
                : checking
                  ? "A verificar…"
                  : toProcess === 0
                    ? "Nada por fazer nesta seleção"
                    : forceReenrich
                      ? `Voltar a gerar ${toProcess} produto${toProcess === 1 ? "" : "s"}`
                      : `Enriquecer ${toProcess} produto${toProcess === 1 ? "" : "s"} em falta`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
