import { useState } from "react";
import { Sparkles, Wand2, Languages, Shuffle, Image as ImageIcon, Loader2, Eye, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { BuilderAIChatPanel } from "./BuilderAIChatPanel";

interface Props {
  assetId?: string;
  workspaceId?: string;
  assetType: string; // 'landing' | 'email' | ...
  fullHtml: string;
  selection: VisualSelection | null;
  selectionOuterHtml: string | null;
  onReplaceFullHtml: (html: string) => void;
  onPatch: (patch: BuilderPatch) => void;
}

type Variant = { label: string; html: string };

export function BuilderAIPanel({ assetId, workspaceId, assetType, fullHtml, selection, selectionOuterHtml, onReplaceFullHtml, onPatch }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"chat" | "tools">("chat");

  // Generate full
  const [genPrompt, setGenPrompt] = useState("");
  const [genTone, setGenTone] = useState("persuasivo");
  const [genLang, setGenLang] = useState("pt");
  // Generate preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  // Refactor
  const [refactorPrompt, setRefactorPrompt] = useState("Reescreve mais persuasivo e curto");
  // Translate
  const [targetLang, setTargetLang] = useState("en");
  // Variants
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  // Image
  const [imageOpen, setImageOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageResult, setImageResult] = useState<string | null>(null);

  const isEmail = assetType === "email";
  const hasSelection = !!selection?.bid;

  async function callAI(payload: Record<string, unknown>): Promise<any> {
    const { data, error } = await supabase.functions.invoke("builder-ai", { body: payload });
    if (error) throw new Error(error.message);
    if (data?.error === "rate_limited" || data?.error === "payment_required" || data?.error === "ai_gateway_error" || data?.error === "internal_error") {
      throw new Error(data.message || "Erro de IA");
    }
    return data;
  }

  async function handleGenerate() {
    if (!genPrompt.trim()) {
      toast.error("Descreve o que queres gerar");
      return;
    }
    setBusy("generate");
    try {
      const data = await callAI({
        mode: isEmail ? "generate_email" : "generate_page",
        prompt: genPrompt,
        tone: genTone,
        lang: genLang,
      });
      if (data?.html) {
        setPreviewHtml(data.html);
        setPreviewOpen(true);
      } else {
        toast.error("Resposta vazia da IA");
      }
    } catch (e) {
      toast.error("Falha na geração", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  function applyPreview() {
    if (!previewHtml) return;
    onReplaceFullHtml(previewHtml);
    toast.success("Conteúdo aplicado", { description: "HTML substituído. O autosave guarda na próxima edição." });
    setPreviewOpen(false);
    setPreviewHtml(null);
  }

  async function regeneratePreview() {
    await handleGenerate();
  }

  async function handleRefactor() {
    if (!hasSelection && !fullHtml) {
      toast.error("Selecciona um bloco no modo visual ou tem HTML");
      return;
    }
    setBusy("refactor");
    try {
      const data = await callAI({
        mode: "refactor",
        prompt: refactorPrompt,
        selectionHtml: selectionOuterHtml ?? undefined,
        fullHtml: hasSelection ? undefined : fullHtml,
      });
      if (data?.html) {
        if (hasSelection && selection) {
          onPatch({ type: "replaceOuter", bid: selection.bid, value: data.html });
          toast.success("Bloco refactorizado");
        } else {
          onReplaceFullHtml(data.html);
          toast.success("HTML refactorizado");
        }
      }
    } catch (e) {
      toast.error("Falha no refactor", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function handleVariants() {
    if (!hasSelection) {
      toast.error("Selecciona um bloco no modo visual");
      return;
    }
    setBusy("variants");
    try {
      const data = await callAI({
        mode: "variants",
        variants: 3,
        selectionHtml: selectionOuterHtml ?? undefined,
      });
      if (Array.isArray(data?.variants) && data.variants.length > 0) {
        setVariants(data.variants);
        setVariantsOpen(true);
      } else {
        toast.error("Sem variantes geradas");
      }
    } catch (e) {
      toast.error("Falha nas variantes", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function handleTranslate() {
    if (!hasSelection && !fullHtml) {
      toast.error("Selecciona um bloco ou tem HTML");
      return;
    }
    setBusy("translate");
    try {
      const data = await callAI({
        mode: "translate",
        targetLang,
        selectionHtml: selectionOuterHtml ?? undefined,
        fullHtml: hasSelection ? undefined : fullHtml,
      });
      if (data?.html) {
        if (hasSelection && selection) {
          onPatch({ type: "replaceOuter", bid: selection.bid, value: data.html });
        } else {
          onReplaceFullHtml(data.html);
        }
        toast.success(`Traduzido para ${targetLang.toUpperCase()}`);
      }
    } catch (e) {
      toast.error("Falha na tradução", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      toast.error("Descreve a imagem");
      return;
    }
    setBusy("image");
    setImageResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("builder-ai-image", {
        body: { prompt: imagePrompt },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || "Erro");
      if (data?.imageUrl) {
        setImageResult(data.imageUrl);
      } else {
        toast.error("Sem imagem devolvida");
      }
    } catch (e) {
      toast.error("Falha na imagem", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  function applyImageToSelection() {
    if (!imageResult) return;
    if (!hasSelection || !selection) {
      toast.error("Selecciona uma <img> no modo visual primeiro");
      return;
    }
    if (selection.tag.toLowerCase() !== "img") {
      toast.error("A selecção tem de ser uma imagem (<img>)");
      return;
    }
    onPatch({ type: "attr", bid: selection.bid, name: "src", value: imageResult });
    toast.success("Imagem aplicada");
    setImageOpen(false);
    setImageResult(null);
  }

  function pickVariant(v: Variant) {
    if (!selection) return;
    onPatch({ type: "replaceOuter", bid: selection.bid, value: v.html });
    toast.success(`Variante ${v.label} aplicada`);
    setVariantsOpen(false);
  }

  if (mode === "chat" && assetId && workspaceId) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-2 pt-2 shrink-0">
          <div className="flex gap-1 p-1 bg-muted rounded-md text-xs">
            <button
              type="button"
              className="flex-1 rounded px-2 py-1 bg-background shadow-sm font-medium"
              onClick={() => setMode("chat")}
            >
              Chat IA
            </button>
            <button
              type="button"
              className="flex-1 rounded px-2 py-1 text-muted-foreground hover:text-foreground"
              onClick={() => setMode("tools")}
            >
              Ferramentas
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <BuilderAIChatPanel
            assetId={assetId}
            workspaceId={workspaceId}
            assetType={assetType}
            fullHtml={fullHtml}
            selection={selection}
            selectionOuterHtml={selectionOuterHtml}
            onReplaceFullHtml={onReplaceFullHtml}
            onPatch={onPatch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {assetId && workspaceId && (
        <div className="px-2 pt-2 shrink-0">
          <div className="flex gap-1 p-1 bg-muted rounded-md text-xs">
            <button
              type="button"
              className="flex-1 rounded px-2 py-1 text-muted-foreground hover:text-foreground"
              onClick={() => setMode("chat")}
            >
              Chat IA
            </button>
            <button
              type="button"
              className="flex-1 rounded px-2 py-1 bg-background shadow-sm font-medium"
              onClick={() => setMode("tools")}
            >
              Ferramentas
            </button>
          </div>
        </div>
      )}
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Ferramentas IA</h3>
      </div>
      <ScrollArea className="flex-1">

        <Tabs defaultValue="generate" className="p-3">
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="generate" className="text-xs px-1"><Wand2 className="h-3 w-3 mr-1" />Gerar</TabsTrigger>
            <TabsTrigger value="refactor" className="text-xs px-1"><Sparkles className="h-3 w-3 mr-1" />Editar</TabsTrigger>
            <TabsTrigger value="variants" className="text-xs px-1"><Shuffle className="h-3 w-3 mr-1" />A/B</TabsTrigger>
            <TabsTrigger value="image" className="text-xs px-1"><ImageIcon className="h-3 w-3 mr-1" />Img</TabsTrigger>
          </TabsList>

          {/* GENERATE */}
          <TabsContent value="generate" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Descreve o {isEmail ? "email" : "landing/página"}</Label>
              <Textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder={isEmail ? "Ex: email de recuperação de carrinho com código de desconto 10%" : "Ex: landing para curso de gestão de tempo, hero + 3 benefícios + CTA + FAQ"}
                rows={5}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tom</Label>
                <select
                  value={genTone}
                  onChange={(e) => setGenTone(e.target.value)}
                  className="w-full h-8 text-sm rounded-md border bg-background px-2"
                >
                  <option value="persuasivo">Persuasivo</option>
                  <option value="profissional">Profissional</option>
                  <option value="casual">Casual</option>
                  <option value="direto">Direto</option>
                  <option value="entusiasta">Entusiasta</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Idioma</Label>
                <select
                  value={genLang}
                  onChange={(e) => setGenLang(e.target.value)}
                  className="w-full h-8 text-sm rounded-md border bg-background px-2"
                >
                  <option value="pt">Português (PT)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={handleGenerate} disabled={busy !== null}>
              {busy === "generate" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
              Gerar e pré-visualizar
            </Button>
            <p className="text-[11px] text-muted-foreground">Mostra preview lado-a-lado antes de aplicar. Nada é alterado até confirmares.</p>
          </TabsContent>


          {/* REFACTOR */}
          <TabsContent value="refactor" className="space-y-3 mt-3">
            <div className="rounded-md border bg-muted/30 p-2 text-xs">
              {hasSelection ? (
                <span>Bloco seleccionado: <code className="font-mono">{selection?.tag}</code></span>
              ) : (
                <span className="text-muted-foreground">Sem selecção — vai actuar no HTML completo. Para escopar, selecciona um bloco no modo visual.</span>
              )}
            </div>
            <div>
              <Label className="text-xs">Instrução</Label>
              <Textarea value={refactorPrompt} onChange={(e) => setRefactorPrompt(e.target.value)} rows={4} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              {["Mais curto", "Mais persuasivo", "Tom profissional", "Tom casual", "Adiciona CTA", "Corrige PT-PT"].map((p) => (
                <Button key={p} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRefactorPrompt(p)}>
                  {p}
                </Button>
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={handleRefactor} disabled={busy !== null}>
              {busy === "refactor" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Aplicar
            </Button>

            <div className="pt-3 border-t">
              <Label className="text-xs flex items-center gap-1"><Languages className="h-3 w-3" /> Traduzir</Label>
              <div className="flex gap-2 mt-1">
                <Input value={targetLang} onChange={(e) => setTargetLang(e.target.value)} placeholder="en, es, fr..." className="h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={handleTranslate} disabled={busy !== null}>
                  {busy === "translate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Traduzir"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* VARIANTS */}
          <TabsContent value="variants" className="space-y-3 mt-3">
            <div className="rounded-md border bg-muted/30 p-2 text-xs">
              {hasSelection ? (
                <span>Vou gerar 3 variantes do bloco <code className="font-mono">{selection?.tag}</code> seleccionado.</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-500">Selecciona um bloco no modo visual primeiro.</span>
              )}
            </div>
            <Button size="sm" className="w-full" onClick={handleVariants} disabled={busy !== null || !hasSelection}>
              {busy === "variants" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5 mr-1.5" />}
              Gerar 3 variantes
            </Button>
          </TabsContent>

          {/* IMAGE */}
          <TabsContent value="image" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              {hasSelection && selection?.tag.toLowerCase() === "img"
                ? `Vais substituir a imagem seleccionada (<img>).`
                : `Para aplicar directamente, selecciona uma <img> no modo visual. Caso contrário, podes copiar o data URL.`}
            </p>
            <Button size="sm" className="w-full" onClick={() => setImageOpen(true)}>
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              Abrir gerador de imagens
            </Button>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* GENERATE PREVIEW DIALOG */}
      <Dialog open={previewOpen} onOpenChange={(o) => { setPreviewOpen(o); if (!o) setPreviewHtml(null); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview da geração IA
            </DialogTitle>
            <DialogDescription>
              Compara o conteúdo actual com o gerado. Aplica para substituir o HTML, ou descarta para manter o original.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-hidden">
            <div className="flex flex-col min-h-0">
              <div className="text-xs font-medium text-muted-foreground mb-1 px-1">Antes (actual)</div>
              <iframe
                srcDoc={`<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${fullHtml || '<div class="p-8 text-gray-400 text-center">Vazio</div>'}</body></html>`}
                className="flex-1 w-full border rounded bg-white min-h-[400px]"
                sandbox="allow-same-origin"
                title="Antes"
              />
            </div>
            <div className="flex flex-col min-h-0">
              <div className="text-xs font-medium text-primary mb-1 px-1">Depois (gerado)</div>
              <iframe
                srcDoc={`<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${previewHtml ?? ''}</body></html>`}
                className="flex-1 w-full border-2 border-primary/40 rounded bg-white min-h-[400px]"
                sandbox="allow-same-origin"
                title="Depois"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPreviewOpen(false); setPreviewHtml(null); }}>
              <X className="h-4 w-4 mr-1.5" /> Descartar
            </Button>
            <Button variant="outline" onClick={regeneratePreview} disabled={busy !== null}>
              {busy === "generate" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Regenerar
            </Button>
            <Button onClick={applyPreview}>
              <Check className="h-4 w-4 mr-1.5" /> Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VARIANTS DIALOG */}
      <Dialog open={variantsOpen} onOpenChange={setVariantsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Variantes A/B geradas</DialogTitle>
            <DialogDescription>Escolhe a variante para aplicar ao bloco seleccionado.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-1">
              {variants.map((v, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variante {v.label || String.fromCharCode(65 + i)}</span>
                    <Button size="sm" onClick={() => pickVariant(v)}>Aplicar</Button>
                  </div>
                  <iframe
                    srcDoc={`<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="p-4">${v.html}</body></html>`}
                    className="w-full h-48 border rounded bg-white"
                    sandbox="allow-same-origin"
                    title={`Variante ${i}`}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* IMAGE DIALOG */}
      <Dialog open={imageOpen} onOpenChange={(o) => { setImageOpen(o); if (!o) setImageResult(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar imagem com IA</DialogTitle>
            <DialogDescription>Modelo Nano Banana via Lovable AI.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Ex: hero illustration de uma equipa portuguesa a colaborar em escritório moderno, estilo flat, cores azul e branco"
              rows={4}
            />
            <Button onClick={handleGenerateImage} disabled={busy !== null}>
              {busy === "image" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              Gerar
            </Button>
            {imageResult && (
              <div className="space-y-2">
                <img src={imageResult} alt="Generated" className="w-full max-h-80 object-contain border rounded bg-muted" />
                <p className="text-xs text-muted-foreground break-all">A imagem é um data-URL embebido. Aplicar a uma {`<img>`} guarda-a inline no HTML.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageOpen(false)}>Fechar</Button>
            <Button onClick={applyImageToSelection} disabled={!imageResult}>
              Aplicar à selecção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
