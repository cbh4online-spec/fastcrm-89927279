import { useState } from "react";
import { Sparkles, Loader2, Eye, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { VisualSelection } from "./BuilderVisualEditor";
import type { BuilderPatch } from "../lib/builderHtmlPatch";
import { getOuterHtmlByBid } from "../lib/builderHtmlPatch";

interface Props {
  selection: VisualSelection;
  fullHtml: string;
  onPatch: (patch: BuilderPatch) => void;
}

const PRESETS = [
  "Mais persuasivo e directo",
  "Mais curto, mantendo a mensagem",
  "Tom profissional e formal",
  "Tom casual e próximo",
  "Adicionar urgência (escassez, prazo)",
  "Reforçar prova social e benefícios",
  "Corrigir gramática e PT-PT",
];

export function BlockAIRefactorButton({ selection, fullHtml, onPatch }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("Reescreve mais persuasivo e curto, mantendo o mesmo layout.");
  const [busy, setBusy] = useState(false);
  const [resultHtml, setResultHtml] = useState<string | null>(null);

  const originalOuter = selection?.bid ? getOuterHtmlByBid(fullHtml, selection.bid) : null;

  async function generate() {
    if (!originalOuter) {
      toast.error("Sem HTML para o bloco seleccionado");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Descreve a alteração pretendida");
      return;
    }
    setBusy(true);
    setResultHtml(null);
    try {
      const { data, error } = await supabase.functions.invoke("builder-ai", {
        body: {
          mode: "refactor",
          prompt: `${prompt}\n\nIMPORTANTE: PRESERVA o layout — mesma tag root, mesmas classes Tailwind, mesma estrutura de filhos e atributos não-textuais (src, href, data-*). Apenas altera o copy/texto e, se necessário, ajustes mínimos de microcópia. Não introduzas <script> nem <style>.`,
          selectionHtml: originalOuter,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || "Falha na IA");
      if (!data?.html) throw new Error("Resposta vazia");
      setResultHtml(data.html);
    } catch (e) {
      toast.error("Erro no refactor", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!resultHtml || !selection) return;
    onPatch({ type: "replaceOuter", bid: selection.bid, value: resultHtml });
    toast.success("Bloco refactorizado", { description: "Layout preservado, copy actualizado." });
    setOpen(false);
    setResultHtml(null);
  }

  function openDialog() {
    setResultHtml(null);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 hover:from-primary/15"
        onClick={openDialog}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
        Refactor com IA
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResultHtml(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Refactor IA — bloco{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{selection.tag}</code>
            </DialogTitle>
            <DialogDescription>
              A IA reescreve o copy mantendo o layout (tag, classes Tailwind, estrutura). Pré-visualiza antes de aplicar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 shrink-0">
            <div>
              <Label className="text-xs">Instrução</Label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="text-sm" />
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPrompt(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <Button onClick={generate} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {resultHtml ? "Regenerar" : "Gerar pré-visualização"}
            </Button>
          </div>

          {resultHtml && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-hidden mt-3">
              <div className="flex flex-col min-h-0">
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Antes
                </div>
                <iframe
                  srcDoc={`<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-4">${originalOuter ?? ""}</body></html>`}
                  className="flex-1 w-full border rounded bg-white min-h-[300px]"
                  sandbox="allow-same-origin"
                  title="Antes"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <div className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Depois
                </div>
                <iframe
                  srcDoc={`<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-4">${resultHtml}</body></html>`}
                  className="flex-1 w-full border-2 border-primary/40 rounded bg-white min-h-[300px]"
                  sandbox="allow-same-origin"
                  title="Depois"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
            {resultHtml && (
              <>
                <Button variant="outline" onClick={generate} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                  Regenerar
                </Button>
                <Button onClick={apply}>
                  <Check className="h-4 w-4 mr-1.5" /> Aplicar ao bloco
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
