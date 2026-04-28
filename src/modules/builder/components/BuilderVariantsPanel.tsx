import { useMemo, useState } from "react";
import {
  Shuffle,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Check,
  GitCompare,
  Sparkles,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  useBuilderVariants,
  useCreateBuilderVariant,
  useUpdateBuilderVariant,
  useDeleteBuilderVariant,
  type BuilderAssetVariant,
} from "../hooks/useBuilderVariants";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  assetId: string;
  workspaceId: string;
  assetType: string;
  currentHtml: string;
  onApplyVariant: (html: string) => void;
}

function tailwindWrap(html: string): string {
  // Wrap fragment in tailwind CDN doc for preview iframes when not full doc.
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script></head><body>${html || '<div class="p-8 text-gray-400 text-center">Vazio</div>'}</body></html>`;
}

export function BuilderVariantsPanel({
  assetId,
  workspaceId,
  assetType,
  currentHtml,
  onApplyVariant,
}: Props) {
  const { data: variants, isLoading } = useBuilderVariants(assetId);
  const createVariant = useCreateBuilderVariant();
  const updateVariant = useUpdateBuilderVariant();
  const deleteVariant = useDeleteBuilderVariant();

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"snapshot" | "ai">("snapshot");
  const [newLabel, setNewLabel] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("persuasivo");
  const [aiBusy, setAiBusy] = useState(false);

  const [previewVariant, setPreviewVariant] = useState<BuilderAssetVariant | null>(null);
  const [compareLeft, setCompareLeft] = useState<string | null>(null);
  const [compareRight, setCompareRight] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BuilderAssetVariant | null>(null);
  const [confirmApply, setConfirmApply] = useState<BuilderAssetVariant | null>(null);

  const isEmail = assetType === "email";

  const nextSuggestedLabel = useMemo(() => {
    const used = new Set((variants ?? []).map((v) => v.label.toUpperCase()));
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const l of letters) {
      const candidate = `Variante ${l}`;
      if (!used.has(candidate.toUpperCase())) return candidate;
    }
    return `Variante ${(variants?.length ?? 0) + 1}`;
  }, [variants]);

  function openCreate(mode: "snapshot" | "ai") {
    setCreateMode(mode);
    setNewLabel(nextSuggestedLabel);
    setNewNotes("");
    setAiPrompt("");
    setCreateOpen(true);
  }

  async function handleCreateSnapshot() {
    if (!newLabel.trim()) {
      toast.error("Indica um nome para a variante");
      return;
    }
    if (!currentHtml || currentHtml.trim().length < 10) {
      toast.error("O documento actual está vazio");
      return;
    }
    try {
      await createVariant.mutateAsync({
        assetId,
        workspaceId,
        label: newLabel,
        notes: newNotes,
        html: currentHtml,
      });
      toast.success("Variante criada", { description: "Snapshot do HTML actual guardado." });
      setCreateOpen(false);
    } catch (e) {
      toast.error("Erro ao criar variante", { description: e instanceof Error ? e.message : undefined });
    }
  }

  async function handleCreateAI() {
    if (!newLabel.trim()) {
      toast.error("Indica um nome para a variante");
      return;
    }
    if (!aiPrompt.trim()) {
      toast.error("Descreve o que muda nesta variante (ex: CTA mais agressivo)");
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("builder-ai", {
        body: {
          mode: "refactor",
          prompt: `Cria uma variante alternativa para teste A/B desta página com o seguinte foco: ${aiPrompt}. Mantém a estrutura geral mas altera copy/CTAs/ordem onde fizer sentido. Tom: ${aiTone}.`,
          fullHtml: currentHtml,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || "Falha na IA");
      if (!data?.html) throw new Error("Resposta vazia da IA");

      await createVariant.mutateAsync({
        assetId,
        workspaceId,
        label: newLabel,
        notes: aiPrompt,
        html: data.html,
      });
      toast.success("Variante IA criada");
      setCreateOpen(false);
    } catch (e) {
      toast.error("Erro a gerar variante", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setAiBusy(false);
    }
  }

  async function handleOverwriteWithCurrent(v: BuilderAssetVariant) {
    try {
      await updateVariant.mutateAsync({ id: v.id, assetId, html: currentHtml });
      toast.success(`"${v.label}" actualizada com o HTML actual`);
    } catch (e) {
      toast.error("Erro ao actualizar", { description: e instanceof Error ? e.message : undefined });
    }
  }

  function startCompare(variant: BuilderAssetVariant) {
    setCompareLeft(currentHtml);
    setCompareRight(variant.html);
    setCompareOpen(true);
  }

  function compareTwoVariants(a: BuilderAssetVariant, b: BuilderAssetVariant) {
    setCompareLeft(a.html);
    setCompareRight(b.html);
    setCompareOpen(true);
  }

  function applyVariantNow(v: BuilderAssetVariant) {
    onApplyVariant(v.html);
    toast.success(`"${v.label}" aplicada ao editor`, {
      description: "Sugestão: cria primeiro um snapshot da versão actual antes de descartar.",
    });
    setConfirmApply(null);
    setPreviewVariant(null);
  }

  const list = variants ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
        <Shuffle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Variantes A/B</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">{list.length}</Badge>
      </div>

      <div className="px-3 py-2 grid grid-cols-2 gap-2 border-b shrink-0">
        <Button size="sm" variant="outline" onClick={() => openCreate("snapshot")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Snapshot
        </Button>
        <Button size="sm" onClick={() => openCreate("ai")}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar com IA
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : list.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Sem variantes. Cria um <strong>snapshot</strong> da versão actual ou pede à IA para gerar uma alternativa.
            </div>
          ) : (
            list.map((v) => (
              <div key={v.id} className="border rounded-lg overflow-hidden bg-card">
                <div className="p-2 flex items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">{v.label}</Badge>
                  {v.notes && (
                    <span className="text-[11px] text-muted-foreground truncate flex-1" title={v.notes}>
                      {v.notes}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {new Date(v.created_at).toLocaleDateString("pt-PT")}
                  </span>
                </div>
                <iframe
                  srcDoc={tailwindWrap(v.html)}
                  className="w-full h-32 border-t bg-white pointer-events-none"
                  sandbox="allow-same-origin"
                  title={v.label}
                />
                <div className="p-2 grid grid-cols-4 gap-1 border-t bg-muted/20">
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setPreviewVariant(v)} title="Pré-visualizar">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => startCompare(v)} title="Comparar com actual">
                    <GitCompare className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-1"
                    onClick={() => handleOverwriteWithCurrent(v)}
                    disabled={updateVariant.isPending}
                    title="Substituir pela versão actual"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-1 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(v)} title="Apagar">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="w-full rounded-none h-8"
                  onClick={() => setConfirmApply(v)}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Aplicar ao editor
                </Button>
              </div>
            ))
          )}

          {list.length >= 2 && (
            <div className="pt-2 border-t">
              <Label className="text-[11px] text-muted-foreground">Comparar duas variantes</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <select
                  className="h-8 text-xs rounded-md border bg-background px-2"
                  defaultValue=""
                  onChange={(e) => {
                    const a = list.find((x) => x.id === e.target.value);
                    if (a) setCompareLeft(a.html);
                  }}
                >
                  <option value="">— Esquerda —</option>
                  {list.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                <select
                  className="h-8 text-xs rounded-md border bg-background px-2"
                  defaultValue=""
                  onChange={(e) => {
                    const b = list.find((x) => x.id === e.target.value);
                    if (b) setCompareRight(b.html);
                  }}
                >
                  <option value="">— Direita —</option>
                  {list.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 h-7 text-xs"
                disabled={!compareLeft || !compareRight}
                onClick={() => setCompareOpen(true)}
              >
                <GitCompare className="h-3 w-3 mr-1" /> Comparar selecção
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createMode === "snapshot" ? "Nova variante (snapshot)" : "Gerar variante com IA"}
            </DialogTitle>
            <DialogDescription>
              {createMode === "snapshot"
                ? "Guarda o HTML actual como uma nova variante para teste A/B."
                : `Gera uma alternativa do ${isEmail ? "email" : "página"} actual com base num foco/instrução.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome da variante</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={80} placeholder="Ex: Variante B - CTA verde" />
            </div>
            {createMode === "snapshot" ? (
              <div>
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} maxLength={500} placeholder="O que distingue esta variante" />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Foco / mudança a testar</Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    placeholder="Ex: CTA mais directo e urgente, mover prova social para cima do hero, headline focada em poupança"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tom</Label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full h-8 text-sm rounded-md border bg-background px-2"
                  >
                    <option value="persuasivo">Persuasivo</option>
                    <option value="profissional">Profissional</option>
                    <option value="casual">Casual</option>
                    <option value="direto">Direto</option>
                    <option value="entusiasta">Entusiasta</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              <X className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
            {createMode === "snapshot" ? (
              <Button onClick={handleCreateSnapshot} disabled={createVariant.isPending}>
                {createVariant.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Criar
              </Button>
            ) : (
              <Button onClick={handleCreateAI} disabled={aiBusy || createVariant.isPending}>
                {aiBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                Gerar e guardar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewVariant} onOpenChange={(o) => !o && setPreviewVariant(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Pré-visualização: {previewVariant?.label}
            </DialogTitle>
            {previewVariant?.notes && <DialogDescription>{previewVariant.notes}</DialogDescription>}
          </DialogHeader>
          {previewVariant && (
            <iframe
              srcDoc={tailwindWrap(previewVariant.html)}
              className="flex-1 w-full border rounded bg-white min-h-[500px]"
              sandbox="allow-same-origin allow-popups"
              title="Preview"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewVariant(null)}>Fechar</Button>
            {previewVariant && (
              <Button onClick={() => setConfirmApply(previewVariant)}>
                <Check className="h-4 w-4 mr-1.5" /> Aplicar ao editor
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPARE DIALOG */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" /> Comparação lado-a-lado
            </DialogTitle>
            <DialogDescription>Inspecciona diferenças visuais entre duas versões.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">
            <div className="flex flex-col min-h-0">
              <div className="text-xs font-medium text-muted-foreground mb-1">Esquerda</div>
              <iframe
                srcDoc={tailwindWrap(compareLeft ?? "")}
                className="flex-1 w-full border rounded bg-white min-h-[450px]"
                sandbox="allow-same-origin"
                title="Esquerda"
              />
            </div>
            <div className="flex flex-col min-h-0">
              <div className="text-xs font-medium text-primary mb-1">Direita</div>
              <iframe
                srcDoc={tailwindWrap(compareRight ?? "")}
                className="flex-1 w-full border-2 border-primary/40 rounded bg-white min-h-[450px]"
                sandbox="allow-same-origin"
                title="Direita"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPLY CONFIRM */}
      <AlertDialog open={!!confirmApply} onOpenChange={(o) => !o && setConfirmApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar "{confirmApply?.label}" ao editor?</AlertDialogTitle>
            <AlertDialogDescription>
              O HTML actual será substituído pelo desta variante. O autosave guarda o asset nos próximos segundos.
              Recomendado: cria primeiro um snapshot da versão actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmApply && applyVariantNow(confirmApply)}>
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar variante "{confirmDelete?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDelete) return;
                try {
                  await deleteVariant.mutateAsync({ id: confirmDelete.id, assetId });
                  toast.success("Variante apagada");
                } catch (e) {
                  toast.error("Erro ao apagar", { description: e instanceof Error ? e.message : undefined });
                }
                setConfirmDelete(null);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
