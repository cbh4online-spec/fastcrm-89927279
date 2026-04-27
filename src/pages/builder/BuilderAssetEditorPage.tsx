import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, AlertCircle, Rocket, BarChart3, Blocks, History, Save, Code2, MousePointerClick, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/modules/builder/components/BuilderVisualEditor";
import { BuilderPropertiesPanel } from "@/modules/builder/components/BuilderPropertiesPanel";
import {
  ensureBids,
  applyPatch,
  type BuilderPatch,
} from "@/modules/builder/lib/builderHtmlPatch";
import {
  useBuilderAsset,
  useUpdateBuilderAsset,
} from "@/modules/builder/hooks/useBuilderAssets";
import { useUserRole } from "@/hooks/useUserRole";

const AUTOSAVE_DEBOUNCE_MS = 2000;

const STATUS_LABEL: Record<BuilderAssetStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

type SidePanel = "blocks" | "versions" | "properties";
type EditMode = "code" | "visual";

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
  const [sidePanel, setSidePanel] = useState<SidePanel>("blocks");
  const [saveBlockOpen, setSaveBlockOpen] = useState(false);
  const [saveBlockHtml, setSaveBlockHtml] = useState("");
  const [editMode, setEditMode] = useState<EditMode>("code");
  const [selection, setSelection] = useState<VisualSelection | null>(null);

  // hidratar quando o asset carrega
  const lastLoadedId = useRef<string | null>(null);
  useEffect(() => {
    if (asset && asset.id !== lastLoadedId.current) {
      setHtml(asset.html);
      setName(asset.name);
      setStatus(asset.status);
      setSaveState("idle");
      lastLoadedId.current = asset.id;
    }
  }, [asset]);

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
    editorRef.current?.insertAtCursor(snippet);
  };

  const handleOpenSaveBlock = () => {
    const sel = editorRef.current?.getSelection() ?? "";
    const initial = sel.trim().length > 0 ? sel : html;
    if (initial.trim().length < 10) {
      toast.error("Sem conteúdo para guardar");
      return;
    }
    setSaveBlockHtml(initial);
    setSaveBlockOpen(true);
  };

  // ===== Modo visual: garante bids antes de entrar e aplica patches =====
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
    setHtml((prev) => applyPatch(prev, patch));
    // Se editou texto, actualizar selecção local
    if (patch.type === "text" && selection && selection.bid === patch.bid) {
      setSelection({ ...selection, text: patch.value });
    }
  };

  const metadataDirty = useMemo(
    () => !!asset && (name !== asset.name || status !== asset.status),
    [asset, name, status],
  );

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
                  className="h-8 max-w-sm font-medium"
                  placeholder="Nome do asset"
                  maxLength={120}
                />
                <Badge variant="outline" className="shrink-0">
                  {BUILDER_ASSET_TYPES.find((t) => t.value === asset.type)?.label ?? asset.type}
                </Badge>
                <span className="text-xs text-muted-foreground hidden md:inline shrink-0">
                  /{asset.slug}
                </span>
              </>
            ) : null}
          </div>

          {asset && (
            <div className="flex items-center gap-2 shrink-0">
              <Select value={status} onValueChange={(v) => setStatus(v as BuilderAssetStatus)}>
                <SelectTrigger className="h-8 w-[130px]">
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
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveMetadata}
                disabled={!metadataDirty || updateAsset.isPending}
              >
                Aplicar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenSaveBlock}
                title="Guardar selecção (ou tudo) como bloco reutilizável"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Guardar bloco
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAnalyticsOpen(true)}
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                Analytics
              </Button>
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
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
              <ResizablePanel defaultSize={40} minSize={25}>
                <BuilderCodeEditor
                  ref={editorRef}
                  value={html}
                  onChange={setHtml}
                  saveState={saveState}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={38} minSize={25}>
                <BuilderPreviewFrame html={html} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
                <div className="h-full flex flex-col">
                  <div className="flex gap-1 p-1 bg-muted rounded-md text-xs m-2 mb-0 shrink-0">
                    <button
                      className={`flex-1 px-2 py-1.5 rounded flex items-center justify-center gap-1.5 ${sidePanel === "blocks" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
                      onClick={() => setSidePanel("blocks")}
                    >
                      <Blocks className="h-3.5 w-3.5" /> Blocos
                    </button>
                    <button
                      className={`flex-1 px-2 py-1.5 rounded flex items-center justify-center gap-1.5 ${sidePanel === "versions" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
                      onClick={() => setSidePanel("versions")}
                    >
                      <History className="h-3.5 w-3.5" /> Versões
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    {sidePanel === "blocks" ? (
                      <BuilderBlocksPanel onInsert={handleInsertBlock} />
                    ) : (
                      <BuilderVersionsPanel
                        assetId={asset.id}
                        workspaceId={asset.workspace_id}
                        currentHtml={html}
                        onRestore={(restoredHtml, version) => {
                          setHtml(restoredHtml);
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
        </>
      )}
    </DashboardLayout>
  );
}
