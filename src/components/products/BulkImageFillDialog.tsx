/**
 * Recolha automática de fotografias em massa.
 *
 * Para cada produto sem imagem: procura a página oficial/pesquisa web pela
 * referência, aceita apenas imagens com prova de correspondência (página
 * oficial ou referência/modelo presente na origem), importa para o storage do
 * workspace e associa ao produto. Sem prova → não associa nada (fail-closed).
 * Processamento sequencial, com pausa entre pedidos e paragem por créditos.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, ImageIcon, Info, Loader2, X, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface BulkImageTarget {
  id: string;
  name: string;
  sku?: string | null;
  brand?: string | null;
  category?: string | null;
  hasImage: boolean;
}

type ItemStatus = "pending" | "running" | "done" | "skipped" | "no_match" | "failed";
interface ItemState {
  id: string;
  name: string;
  status: ItemStatus;
  detail?: string;
}

interface Candidate {
  url: string;
  source_url?: string;
  source_title?: string;
  origin?: string;
}

const MAX_IMAGES_PER_PRODUCT = 3;
const DELAY_MS = 1500;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Tokens de modelo do SKU (ex.: AJ-HUB2-W → hub2), para provar correspondência. */
function skuTokens(sku?: string | null): string[] {
  if (!sku) return [];
  const full = norm(sku);
  const parts = sku
    .split(/[-_\s/]+/)
    .map(norm)
    .filter((p) => p.length >= 4 && !/^(aj|ajax|w|b|white|black|bl|wh)$/.test(p));
  return Array.from(new Set([full, ...parts])).filter((t) => t.length >= 4);
}

function isGrounded(c: Candidate, tokens: string[]): boolean {
  if (c.origin === "Página oficial") return true;
  if (tokens.length === 0) return false;
  const hay = norm(`${c.url} ${c.source_url ?? ""} ${c.source_title ?? ""}`);
  return tokens.some((t) => hay.includes(t));
}

function toSlug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targets: BulkImageTarget[];
}

export function BulkImageFillDialog({ open, onOpenChange, targets }: Props) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ItemState[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const withoutImage = targets.filter((t) => !t.hasImage);

  useEffect(() => {
    if (!open || running) return;
    setItems(
      withoutImage.map((t) => ({ id: t.id, name: t.name, status: "pending" as ItemStatus })),
    );
    setFinished(false);
    setStopReason(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targets]);

  const patch = (id: string, p: Partial<ItemState>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const processOne = async (t: BulkImageTarget, workspaceId: string): Promise<"stop" | void> => {
    patch(t.id, { status: "running" });
    const query = [t.brand, t.name, t.sku].filter(Boolean).join(" ").trim();
    const { data, error } = await supabase.functions.invoke("product-image-search", {
      body: { query, limit: 5, workspace_id: workspaceId },
    });
    if (error) {
      patch(t.id, { status: "failed", detail: "Pesquisa indisponível" });
      return;
    }
    if (data?.code === "insufficient_credits") {
      patch(t.id, { status: "pending" });
      setStopReason(data?.error || "Créditos insuficientes. A recolha foi pausada.");
      return "stop";
    }
    const candidates: Candidate[] = Array.isArray(data?.candidates) ? data.candidates : [];
    const tokens = skuTokens(t.sku);
    const grounded = candidates.filter((c) => isGrounded(c, tokens)).slice(0, MAX_IMAGES_PER_PRODUCT);
    if (grounded.length === 0) {
      patch(t.id, {
        status: "no_match",
        detail: candidates.length ? "Sem correspondência segura — rever à mão" : "Nenhuma imagem encontrada",
      });
      return;
    }

    const { data: imp, error: impErr } = await supabase.functions.invoke("product-images-import-url", {
      body: { items: grounded.map((c) => ({ url: c.url, source_url: c.source_url })) },
      headers: { "X-Workspace-Id": workspaceId },
    });
    const imported: Array<{ public_url: string }> = impErr ? [] : imp?.imported ?? [];
    if (imported.length === 0) {
      patch(t.id, { status: "failed", detail: "Não foi possível descarregar as imagens" });
      return;
    }

    // Revalida: outro utilizador pode ter adicionado imagem entretanto
    const { data: existing } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", t.id)
      .limit(1);
    if (existing && existing.length > 0) {
      patch(t.id, { status: "skipped", detail: "Já tinha imagem" });
      return;
    }

    const alt = [t.name, t.category, t.sku].filter(Boolean).join(" - ");
    const rows = imported.map((im, idx) => {
      const ext = im.public_url.split(".").pop()?.split("?")[0] || "jpg";
      return {
        workspace_id: workspaceId,
        product_id: t.id,
        url: im.public_url,
        alt_text: alt,
        title: t.name,
        seo_filename: `${[toSlug(t.name), t.sku].filter(Boolean).join("-")}-${idx + 1}.${ext}`,
        is_ai_generated: false,
        position: idx,
      };
    });
    const { error: insErr } = await supabase.from("product_images").insert(rows);
    if (insErr) {
      patch(t.id, { status: "failed", detail: "Erro ao associar ao produto" });
      return;
    }
    patch(t.id, { status: "done", detail: `${rows.length} imagem(ns)` });
  };

  const start = async () => {
    if (!currentWorkspace?.id) return;
    cancelRef.current = false;
    setRunning(true);
    setFinished(false);
    setStopReason(null);
    try {
      for (const t of withoutImage) {
        if (cancelRef.current) break;
        const current = items.find((i) => i.id === t.id);
        if (current && current.status !== "pending") continue;
        try {
          const r = await processOne(t, currentWorkspace.id);
          if (r === "stop") break;
        } catch {
          patch(t.id, { status: "failed", detail: "Erro inesperado" });
        }
        await sleep(DELAY_MS);
      }
    } finally {
      setRunning(false);
      setFinished(true);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-images"] });
    }
  };

  const count = (s: ItemStatus) => items.filter((i) => i.status === s).length;
  const processed = items.filter((i) => i.status !== "pending" && i.status !== "running").length;
  const pct = items.length ? Math.round((processed / items.length) * 100) : 0;
  const alreadyWithImage = targets.length - withoutImage.length;

  const icon = (s: ItemStatus) => {
    switch (s) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "done":
        return <Check className="h-4 w-4 text-success" />;
      case "failed":
        return <X className="h-4 w-4 text-destructive" />;
      case "no_match":
      case "skipped":
        return <MinusCircle className="h-4 w-4 text-warning" />;
      default:
        return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Procurar fotografias automaticamente</DialogTitle>
          <DialogDescription>
            O sistema procura a página oficial de cada produto pela referência e só associa
            imagens com correspondência comprovada. Quando não há prova, o produto fica para rever.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{withoutImage.length} sem fotografia</Badge>
            {alreadyWithImage > 0 && <Badge variant="outline">{alreadyWithImage} já têm (ignorados)</Badge>}
            <Badge variant="outline">{count("done")} com fotografia</Badge>
            <Badge variant="outline">{count("no_match")} para rever</Badge>
            <Badge variant="outline">{count("failed")} falharam</Badge>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cada pesquisa consome créditos. Se os créditos acabarem, a recolha para e pode
              retomar depois sem repetir os produtos já tratados.
            </AlertDescription>
          </Alert>

          {stopReason && (
            <Alert variant="destructive">
              <AlertDescription>{stopReason}</AlertDescription>
            </Alert>
          )}

          {(running || finished) && <Progress value={pct} />}

          <ScrollArea className="h-72 rounded-md border">
            <ul className="divide-y">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  {icon(i.status)}
                  <span className="flex-1 truncate">{i.name}</span>
                  {i.detail && <span className="text-xs text-muted-foreground">{i.detail}</span>}
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Todos os produtos selecionados já têm fotografia.
                </li>
              )}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter>
          {running ? (
            <Button variant="outline" onClick={() => (cancelRef.current = true)}>
              Parar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={start} disabled={count("pending") === 0 || !currentWorkspace?.id}>
                {finished && count("pending") > 0 ? "Retomar" : `Procurar ${count("pending")} fotografia(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
