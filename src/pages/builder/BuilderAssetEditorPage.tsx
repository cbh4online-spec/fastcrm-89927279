import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  AlertCircle,
  Rocket,
  BarChart3,
  Blocks,
  History,
  Save,
  Code2,
  MousePointerClick,
  SlidersHorizontal,
  Download,
  Sparkles,
  Shuffle,
  Undo2,
  Redo2,
  Search,
  ExternalLink,
  Check,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  BUILDER_ASSET_TYPES,
  type BuilderAssetStatus,
} from "@/modules/builder/types";
import { BuilderPreviewFrame } from "@/modules/builder/components/BuilderPreviewFrame";
import {
  BuilderCodeEditor,
  type SaveState,
  type BuilderCodeEditorHandle,
} from "@/modules/builder/components/BuilderCodeEditor";
import { BuilderVersionsPanel } from "@/modules/builder/components/BuilderVersionsPanel";
import { BuilderPublishPanel } from "@/modules/builder/components/BuilderPublishPanel";
import { BuilderAnalyticsPanel } from "@/modules/builder/components/BuilderAnalyticsPanel";
import { BuilderBlocksPanel } from "@/modules/builder/components/BuilderBlocksPanel";
import { SaveBlockDialog } from "@/modules/builder/components/SaveBlockDialog";
import {
  BuilderVisualEditor,
  type VisualSelection,
  type SectionAction,
  type DropPosition,
} from "@/modules/builder/components/BuilderVisualEditor";
import { BuilderPropertiesPanel } from "@/modules/builder/components/BuilderPropertiesPanel";
import { BuilderSeoPanel } from "@/modules/builder/components/BuilderSeoPanel";
import { BuilderExportDialog } from "@/modules/builder/components/BuilderExportDialog";
import { BuilderAIPanel } from "@/modules/builder/components/BuilderAIPanel";
import { BuilderVariantsPanel } from "@/modules/builder/components/BuilderVariantsPanel";
import { BuilderClonedSiteWorkspace } from "@/modules/builder/components/BuilderClonedSiteWorkspace";
import {
  ensureBids,
  applyPatch,
  getOuterHtmlByBid,
  moveSection,
  duplicateSection,
  removeSection,
  insertHtmlAt,
  resolveSectionBid,
  type BuilderPatch,
} from "@/modules/builder/lib/builderHtmlPatch";
import { useBuilderHistory } from "@/modules/builder/hooks/useBuilderHistory";
import {
  useBuilderAsset,
  useUpdateBuilderAsset,
} from "@/modules/builder/hooks/useBuilderAssets";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const AUTOSAVE_DEBOUNCE_MS = 2000;

const STATUS_LABEL: Record<BuilderAssetStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

type SidePanel = "blocks" | "versions" | "properties" | "seo" | "ai" | "variants";
type EditMode = "code" | "visual";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

export default function BuilderAssetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: asset, isLoading, error } = useBuilderAsset(id);
  const updateAsset = useUpdateBuilderAsset();
  const { isSuperAdmin } = useUserRole();

  const editorRef = useRef<BuilderCodeEditorHandle>(null);

  const [html, setHtml] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<BuilderAssetStatus>("draft");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishOpen, setPublishOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>("properties");
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [saveBlockOpen, setSaveBlockOpen] = useState(false);
  const [saveBlockHtml, setSaveBlockHtml] = useState("");
  const [editMode, setEditMode] = useState<EditMode>("visual");
  const [selection, setSelection] = useState<VisualSelection | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const draggedHtmlRef = useRef<string | null>(null);

  const history = useBuilderHistory();
  const htmlRef = useRef("");
  htmlRef.current = html;

  /** Altera o HTML registando o estado anterior no histórico. */
  const commitHtml = useCallback(
    (next: string | ((prev: string) => string)) => {
      const prev = htmlRef.current;
      const value = typeof next === "function" ? next(prev) : next;
      if (value === prev) return;
      history.push(prev);
      setHtml(value);
    },
    [history],
  );

  // hidratar quando o asset carrega
  const lastLoadedId = useRef<string | null>(null);
  useEffect(() => {
    if (asset && asset.id !== lastLoadedId.current) {
      setHtml(ensureBids(asset.html));
      setName(asset.name);
      setStatus(asset.status);
      setSaveState("idle");
      history.reset();
      setSelection(null);
      lastLoadedId.current = asset.id;
    }
  }, [asset, history]);

  // autosave do HTML com debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!asset) return;
    if (html === asset.html) return;
    setSaveState("dirty");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await updateAsset.mutateAsync({ id: asset.id, html });
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        toast.error("Erro ao guardar", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, asset?.id, asset?.html]);

  const saveNow = useCallback(async () => {
    if (!asset) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (htmlRef.current === asset.html) {
      toast.success("Tudo guardado");
      return;
    }
    setSaveState("saving");
    try {
      await updateAsset.mutateAsync({ id: asset.id, html: htmlRef.current });
      setSaveState("saved");
      toast.success("Guardado");
    } catch (err) {
      setSaveState("error");
      toast.error("Erro ao guardar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [asset, updateAsset]);

  // salvar antes de fechar a tab
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  const handleSaveMetadata = async () => {
    if (!asset) return;
    try {
      await updateAsset.mutateAsync({
        id: asset.id,
        name: name !== asset.name ? name : undefined,
        status: status !== asset.status ? status : undefined,
      });
      toast.success("Metadata guardada");
    } catch (err) {
      toast.error("Erro ao guardar metadata", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleInsertBlock = (snippet: string) => {
    if (editMode === "code") {
      editorRef.current?.insertAtCursor(snippet);
      return;
    }
    const targetBid = selection?.bid ? resolveSectionBid(htmlRef.current, selection.bid) : null;
    commitHtml((prev) => insertHtmlAt(prev, targetBid, targetBid ? "after" : "append", snippet));
  };

  const handleOpenSaveBlock = (initialHtml?: string) => {
    const fallback = editorRef.current?.getSelection() ?? "";
    const initial = initialHtml ?? (fallback.trim().length > 0 ? fallback : html);
    if (initial.trim().length < 10) {
      toast.error("Sem conteúdo para guardar");
      return;
    }
    setSaveBlockHtml(initial);
    setSaveBlockOpen(true);
  };

  // ===== Modo visual =====
  const enterVisualMode = () => {
    setHtml((prev) => ensureBids(prev));
    setEditMode("visual");
    setSidePanel("properties");
  };

  const exitVisualMode = () => {
    setEditMode("code");
    setSelection(null);
    if (sidePanel === "properties") setSidePanel("blocks");
  };

  const handleVisualPatch = (patch: BuilderPatch) => {
    commitHtml((prev) => applyPatch(prev, patch));
    if (patch.type === "text" && selection && selection.bid === patch.bid) {
      setSelection({ ...selection, text: patch.value });
    }
  };

  const handleSectionAction = useCallback(
    (action: SectionAction, bid: string) => {
      if (action === "saveBlock") {
        const outer = getOuterHtmlByBid(htmlRef.current, bid);
        if (!outer) return toast.error("Secção não encontrada");
        handleOpenSaveBlock(outer);
        return;
      }
      commitHtml((prev) => {
        switch (action) {
          case "moveUp":
            return moveSection(prev, bid, "up");
          case "moveDown":
            return moveSection(prev, bid, "down");
          case "duplicate":
            return duplicateSection(prev, bid);
          case "delete":
            return removeSection(prev, bid);
          default:
            return prev;
        }
      });
      if (action === "delete" || action === "duplicate") setSelection(null);
      const labels: Record<string, string> = {
        moveUp: "Secção movida",
        moveDown: "Secção movida",
        duplicate: "Secção duplicada",
        delete: "Secção eliminada",
      };
      toast.success(labels[action] ?? "Alteração aplicada", {
        description: `Podes desfazer com ${MOD}+Z.`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitHtml],
  );

  const handleDropBlock = useCallback(
    (targetBid: string | null, position: DropPosition) => {
      const snippet = draggedHtmlRef.current;
      draggedHtmlRef.current = null;
      setDragActive(false);
      if (!snippet) return;
      commitHtml((prev) => insertHtmlAt(prev, targetBid, position, snippet));
      toast.success("Bloco inserido");
    },
    [commitHtml],
  );

  const doUndo = useCallback(() => {
    const prev = history.undo(htmlRef.current);
    if (prev === null) return;
    setHtml(prev);
    setSelection(null);
  }, [history]);

  const doRedo = useCallback(() => {
    const next = history.redo(htmlRef.current);
    if (next === null) return;
    setHtml(next);
    setSelection(null);
  }, [history]);

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
        return;
      }
      if (editMode !== "visual" || typing) return;
      if (mod && e.key.toLowerCase() === "d" && selection) {
        e.preventDefault();
        const sec = resolveSectionBid(htmlRef.current, selection.bid);
        if (sec) handleSectionAction("duplicate", sec);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        const sec = resolveSectionBid(htmlRef.current, selection.bid);
        if (sec) handleSectionAction("delete", sec);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo, saveNow, editMode, selection, handleSectionAction]);

  const metadataDirty = useMemo(
    () => !!asset && (name !== asset.name || status !== asset.status),
    [asset, name, status],
  );

  const selectionOuterHtml = useMemo(
    () => (selection?.bid ? getOuterHtmlByBid(html, selection.bid) : null),
    [html, selection?.bid],
  );

  const handleReplaceFullHtml = (newHtml: string) => {
    commitHtml(ensureBids(newHtml));
    setSelection(null);
  };

  const openInNewTab = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const sidePanelTabs: { key: SidePanel; label: string; icon: typeof Blocks; visualOnly?: boolean }[] =
    [
      { key: "properties", label: "Propriedades", icon: SlidersHorizontal, visualOnly: true },
      { key: "seo", label: "SEO", icon: Search },
      { key: "versions", label: "Versões", icon: History },
      { key: "ai", label: "IA", icon: Sparkles },
      { key: "variants", label: "A/B", icon: Shuffle },
    ];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{asset?.name ? `${asset.name} · Builder` : "Builder"} · FastCRM</title>
      </Helmet>

      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/dashboard/builder">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Link>
            </Button>
            {isLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : asset ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 max-w-[220px] font-medium"
                  placeholder="Nome do asset"
                  aria-label="Nome do asset"
                  maxLength={120}
                />
                <Badge variant="outline" className="shrink-0 hidden lg:inline-flex">
                  {BUILDER_ASSET_TYPES.find((t) => t.value === asset.type)?.label ?? asset.type}
                </Badge>
                <SaveIndicator state={saveState} onRetry={saveNow} />
              </>
            ) : null}
          </div>

          {asset && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={doUndo}
                  disabled={!history.canUndo}
                  aria-label={`Desfazer (${MOD}+Z)`}
                  title={`Desfazer (${MOD}+Z)`}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={doRedo}
                  disabled={!history.canRedo}
                  aria-label={`Refazer (${MOD}+Shift+Z)`}
                  title={`Refazer (${MOD}+Shift+Z)`}
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
                <Button
                  size="sm"
                  variant={editMode === "visual" ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={enterVisualMode}
                >
                  <MousePointerClick className="h-3.5 w-3.5 mr-1" /> Visual
                </Button>
                <Button
                  size="sm"
                  variant={editMode === "code" ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={exitVisualMode}
                >
                  <Code2 className="h-3.5 w-3.5 mr-1" /> Código
                </Button>
              </div>

              {editMode === "visual" && (
                <Button
                  size="sm"
                  variant={blocksOpen ? "secondary" : "outline"}
                  onClick={() => setBlocksOpen((v) => !v)}
                  aria-pressed={blocksOpen}
                >
                  <Blocks className="h-3.5 w-3.5 mr-1.5" /> Blocos
                </Button>
              )}

              <Select value={status} onValueChange={(v) => setStatus(v as BuilderAssetStatus)}>
                <SelectTrigger className="h-8 w-[120px]" aria-label="Estado do asset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as BuilderAssetStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {metadataDirty && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveMetadata}
                  disabled={updateAsset.isPending}
                >
                  Aplicar
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Mais acções">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleOpenSaveBlock()}>
                    <Save className="h-3.5 w-3.5 mr-2" /> Guardar como bloco
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openInNewTab}>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir em novo separador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExportOpen(true)}>
                    <Download className="h-3.5 w-3.5 mr-2" /> Exportar HTML / ZIP
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAnalyticsOpen(true)}>
                    <BarChart3 className="h-3.5 w-3.5 mr-2" /> Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void saveNow()}>
                    <Save className="h-3.5 w-3.5 mr-2" /> Guardar agora ({MOD}+S)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={() => setPublishOpen(true)}
                disabled={saveState === "dirty" || saveState === "saving"}
              >
                <Rocket className="h-3.5 w-3.5 mr-1.5" />
                Publicar
              </Button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-3">
          <div className="lg:hidden text-xs text-muted-foreground border rounded-md p-3 mb-3">
            O editor foi desenhado para ecrãs largos. Num ecrã pequeno, algumas áreas ficam
            comprimidas.
          </div>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 h-full">
              <Skeleton className="h-full" />
              <Skeleton className="h-full" />
              <Skeleton className="h-full" />
            </div>
          ) : error || !asset ? (
            <div className="flex items-center gap-3 text-destructive p-6 border border-destructive/30 rounded-lg max-w-xl mx-auto mt-12">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Asset não encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Pode ter sido removido ou não tens acesso.
                </p>
              </div>
            </div>
          ) : (asset.metadata as Record<string, unknown> | null)?.is_cloned_site ? (
            <BuilderClonedSiteWorkspace assetId={asset.id} workspaceId={asset.workspace_id} />
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
              {editMode === "visual" && blocksOpen && (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <BuilderBlocksPanel
                      onInsert={handleInsertBlock}
                      onDragStartBlock={(blockHtml) => {
                        draggedHtmlRef.current = blockHtml;
                        setDragActive(true);
                      }}
                      onDragEndBlock={() => {
                        draggedHtmlRef.current = null;
                        setDragActive(false);
                      }}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              <ResizablePanel defaultSize={editMode === "visual" ? 58 : 40} minSize={25}>
                {editMode === "code" ? (
                  <BuilderCodeEditor
                    ref={editorRef}
                    value={html}
                    onChange={setHtml}
                    saveState={saveState}
                  />
                ) : (
                  <BuilderVisualEditor
                    html={html}
                    selectedBid={selection?.bid ?? null}
                    onSelect={setSelection}
                    onPatch={handleVisualPatch}
                    onSectionAction={handleSectionAction}
                    onDropBlock={handleDropBlock}
                    dragActive={dragActive}
                  />
                )}
              </ResizablePanel>

              {editMode === "code" && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={38} minSize={25}>
                    <BuilderPreviewFrame html={html} />
                  </ResizablePanel>
                </>
              )}

              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={22} minSize={18} maxSize={38}>
                <div className="h-full flex flex-col">
                  <div className="flex gap-1 p-1 bg-muted rounded-md text-xs m-2 mb-0 shrink-0 overflow-x-auto">
                    {editMode === "code" && (
                      <PanelTab
                        active={sidePanel === "blocks"}
                        icon={Blocks}
                        label="Blocos"
                        onClick={() => setSidePanel("blocks")}
                      />
                    )}
                    {sidePanelTabs
                      .filter((t) => !(t.visualOnly && editMode !== "visual"))
                      .map((t) => (
                        <PanelTab
                          key={t.key}
                          active={sidePanel === t.key}
                          icon={t.icon}
                          label={t.label}
                          onClick={() => setSidePanel(t.key)}
                        />
                      ))}
                  </div>
                  <div className="flex-1 min-h-0">
                    {sidePanel === "properties" && editMode === "visual" ? (
                      <BuilderPropertiesPanel
                        selection={selection}
                        fullHtml={html}
                        onPatch={handleVisualPatch}
                        onClear={() => setSelection(null)}
                      />
                    ) : sidePanel === "blocks" ? (
                      <BuilderBlocksPanel onInsert={handleInsertBlock} />
                    ) : sidePanel === "seo" ? (
                      <BuilderSeoPanel
                        html={html}
                        onApply={(next) => {
                          commitHtml(ensureBids(next));
                          toast.success("Metadados aplicados ao HTML");
                        }}
                      />
                    ) : sidePanel === "ai" ? (
                      <BuilderAIPanel
                        assetType={asset.type}
                        fullHtml={html}
                        selection={selection}
                        selectionOuterHtml={selectionOuterHtml}
                        onReplaceFullHtml={handleReplaceFullHtml}
                        onPatch={handleVisualPatch}
                      />
                    ) : sidePanel === "variants" ? (
                      <BuilderVariantsPanel
                        assetId={asset.id}
                        workspaceId={asset.workspace_id}
                        assetType={asset.type}
                        currentHtml={html}
                        onApplyVariant={handleReplaceFullHtml}
                      />
                    ) : (
                      <BuilderVersionsPanel
                        assetId={asset.id}
                        workspaceId={asset.workspace_id}
                        currentHtml={html}
                        onRestore={(restoredHtml, version) => {
                          commitHtml(ensureBids(restoredHtml));
                          toast.success(`Restaurado v${version.version_number}`, {
                            description: "Será guardado automaticamente em alguns segundos.",
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      {asset && (
        <>
          <BuilderPublishPanel
            open={publishOpen}
            onOpenChange={setPublishOpen}
            assetId={asset.id}
            workspaceId={asset.workspace_id}
            slug={asset.slug}
            currentHtml={html}
            isDirty={saveState === "dirty" || saveState === "saving"}
          />
          <BuilderAnalyticsPanel
            open={analyticsOpen}
            onOpenChange={setAnalyticsOpen}
            assetId={asset.id}
          />
          <SaveBlockDialog
            open={saveBlockOpen}
            onOpenChange={setSaveBlockOpen}
            initialHtml={saveBlockHtml}
            isSuperAdmin={isSuperAdmin}
          />
          <BuilderExportDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            name={asset.name}
            html={html}
          />
        </>
      )}
    </DashboardLayout>
  );
}

function PanelTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Blocks;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 min-w-[72px] px-2 py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors",
        active ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-destructive"
        onClick={onRetry}
      >
        <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Erro ao guardar — tentar de novo
      </Button>
    );
  }
  const map: Record<Exclude<SaveState, "error">, { label: string; icon: JSX.Element }> = {
    idle: { label: "Guardado", icon: <Check className="h-3.5 w-3.5" /> },
    saved: { label: "Guardado", icon: <Check className="h-3.5 w-3.5" /> },
    saving: { label: "A guardar…", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    dirty: { label: "Alterações por guardar", icon: <Save className="h-3.5 w-3.5" /> },
  };
  const info = map[state as Exclude<SaveState, "error">];
  return (
    <span className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
      {info.icon} {info.label}
    </span>
  );
}
