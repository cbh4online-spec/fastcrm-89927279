import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Globe, Check, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Candidate {
  url: string;
  source_url: string;
  source_title?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultQuery: string;
  /** Quantas imagens podem ainda ser adicionadas */
  remainingSlots: number;
  /** Chamado com os public_urls finais já no storage. */
  onPicked: (publicUrls: string[]) => void;
}

export function ProductImageWebSearchDialog({
  open,
  onOpenChange,
  defaultQuery,
  remainingSlots,
  onPicked,
}: Props) {
  const { currentWorkspace } = useWorkspace();
  const [query, setQuery] = useState(defaultQuery);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setQuery(defaultQuery);
      setCandidates([]);
      setPicked(new Set());
      setFailedThumbs(new Set());
      setWarning(null);
    }
  }, [open, defaultQuery]);

  const runSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error("Indica o nome do produto a pesquisar");
      return;
    }
    setSearching(true);
    setCandidates([]);
    setPicked(new Set());
    setFailedThumbs(new Set());
    setWarning(null);
    try {
      const { data, error } = await supabase.functions.invoke("product-image-search", {
        body: { query: query.trim(), limit: 5 },
      });
      if (error) throw new Error(error.message);
      if (!data?.success && data?.error) setWarning(data.error);
      const list: Candidate[] = Array.isArray(data?.candidates) ? data.candidates : [];
      setCandidates(list);
      if (list.length === 0 && !data?.error) {
        setWarning("Não foi possível encontrar imagens para esta pesquisa.");
      }
    } catch (e) {
      toast.error("Falha na pesquisa: " + (e as Error).message);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const togglePick = (url: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else if (next.size < remainingSlots) next.add(url);
      else toast.warning(`Máximo de ${remainingSlots} novas imagens`);
      return next;
    });
  };

  const handleImport = async () => {
    if (picked.size === 0) return;
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }
    setImporting(true);
    setWarning(null);
    try {
      const urls = Array.from(picked);
      const items = urls.map((u) => ({
        url: u,
        source_url: candidates.find((c) => c.url === u)?.source_url,
      }));

      // O download é feito no servidor (o browser é bloqueado por CORS na origem)
      const { data, error } = await supabase.functions.invoke("product-images-import-url", {
        body: { items },
        headers: { "X-Workspace-Id": currentWorkspace.id },
      });
      if (error) throw new Error(error.message || "Falha ao importar imagens");

      const imported = (data?.imported ?? []) as Array<{ url: string; public_url: string }>;
      const failed = (data?.failed ?? []) as Array<{ url: string; reason: string }>;

      if (imported.length === 0) {
        const reason = failed[0]?.reason || data?.message || "origem indisponível";
        toast.error(`Não foi possível importar nenhuma imagem (${reason}).`);
        setWarning(
          failed.length
            ? `Falhas: ${failed.map((f) => f.reason).join("; ")}`
            : "Tenta outra imagem ou outra pesquisa.",
        );
        return;
      }

      onPicked(imported.map((i) => i.public_url));
      if (failed.length > 0) {
        toast.warning(
          `${imported.length} de ${urls.length} importadas — ${failed.length} falhou(aram): ${failed
            .map((f) => f.reason)
            .join("; ")}`,
        );
      } else {
        toast.success(`${imported.length} imagem(ns) adicionada(s) ao produto`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Pesquisar imagens online
          </DialogTitle>
          <DialogDescription>
            Imagens reais extraídas de páginas web públicas. Não são geradas por IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome do produto, marca, modelo…"
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            disabled={searching}
          />
          <Button onClick={runSearch} disabled={searching || !query.trim()}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Pesquisar</span>
          </Button>
        </div>

        {warning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {searching && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">A procurar imagens reais…</p>
              <p className="text-xs mt-1">Isto pode demorar alguns segundos</p>
            </div>
          )}

          {!searching && candidates.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {candidates.length} imagens encontradas. Selecciona até{" "}
                <strong>{remainingSlots}</strong>.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {candidates
                  .filter((c) => !failedThumbs.has(c.url))
                  .map((c) => {
                    const isPicked = picked.has(c.url);
                    return (
                      <div
                        key={c.url}
                        className={cn(
                          "relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer group transition-all",
                          isPicked
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent hover:border-muted-foreground/30",
                        )}
                        onClick={() => togglePick(c.url)}
                      >
                        <img
                          src={c.url}
                          alt={c.source_title || "Candidata"}
                          loading="lazy"
                          className="h-full w-full object-cover bg-muted"
                          onError={() =>
                            setFailedThumbs((prev) => new Set(prev).add(c.url))
                          }
                        />
                        <div
                          className={cn(
                            "absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center transition-all",
                            isPicked
                              ? "bg-primary text-primary-foreground"
                              : "bg-black/50 text-white opacity-0 group-hover:opacity-100",
                          )}
                        >
                          {isPicked ? <Check className="h-3 w-3" /> : "+"}
                        </div>
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-1 left-1 right-1 flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded truncate opacity-0 group-hover:opacity-100"
                          title={c.source_url}
                        >
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">
                            {new URL(c.source_url).hostname}
                          </span>
                        </a>
                      </div>
                    );
                  })}
              </div>
            </>
          )}

          {!searching && candidates.length === 0 && !warning && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">
                Carrega em <strong>Pesquisar</strong> para começar
              </p>
            </div>
          )}
        </div>

        {picked.size > 0 && (
          <div className="border-t pt-3 mt-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">
                Pré-visualização ({picked.size}) — confirma antes de adicionar
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPicked(new Set())}
                disabled={importing}
              >
                Limpar seleção
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from(picked).map((url) => (
                <div
                  key={`preview-${url}`}
                  className="relative h-24 w-24 shrink-0 rounded-md border overflow-hidden bg-muted group"
                >
                  <img
                    src={url}
                    alt="Selecionada"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => togglePick(url)}
                    disabled={importing}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    title="Remover da seleção"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Badge variant="outline">{picked.size} selecionada(s)</Badge>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={picked.size === 0 || importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Adicionar ao produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
