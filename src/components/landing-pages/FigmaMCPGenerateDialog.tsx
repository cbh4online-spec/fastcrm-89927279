import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Palette,
  Type,
  LayoutGrid,
  Figma,
  Link2,
  Layers,
  AlertCircle,
} from "lucide-react";
import {
  useMCPProviders,
  useImportFromMCP,
  useGeneratePageFromMCP,
  type NormalizedPayload,
} from "@/hooks/useMarketingMCP";

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  cta: "CTA",
  faq: "FAQ",
  pricing: "Preços",
  social_proof: "Prova Social / Testemunhos",
  footer: "Rodapé",
  navigation: "Navegação",
  form: "Formulário / Lead Capture",
  benefits: "Benefícios",
  thank_you: "Agradecimento",
  upsell: "Upsell",
  webinar: "Webinar",
  content: "Conteúdo",
};

const SECTION_TYPE_ICONS: Record<string, string> = {
  hero: "🏠",
  cta: "🔘",
  faq: "❓",
  pricing: "💰",
  social_proof: "⭐",
  footer: "📄",
  navigation: "🧭",
  form: "📝",
  benefits: "✅",
  thank_you: "🎉",
  upsell: "📈",
  webinar: "🎥",
  content: "📋",
};

const IMPORT_TYPES = [
  { value: "page_frame", label: "Página / Frame" },
  { value: "design_system", label: "Design System completo" },
  { value: "section", label: "Secção específica" },
  { value: "component", label: "Componente" },
];

interface FigmaMCPGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onGenerated?: (pageId: string) => void;
}

type Step = "provider" | "import" | "preview" | "generating" | "done";

export function FigmaMCPGenerateDialog({
  open,
  onOpenChange,
  workspaceId,
  onGenerated,
}: FigmaMCPGenerateDialogProps) {
  const { data: allProviders } = useMCPProviders(workspaceId);
  const importMutation = useImportFromMCP(workspaceId);
  const generatePage = useGeneratePageFromMCP(workspaceId);

  const [step, setStep] = useState<Step>("provider");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [importType, setImportType] = useState("page_frame");
  const [externalReference, setExternalReference] = useState("");
  const [importResult, setImportResult] = useState<{
    import_id: string;
    normalized: NormalizedPayload;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Filter Figma providers only
  const figmaProviders = useMemo(
    () =>
      (allProviders || []).filter(
        (p) =>
          p.is_enabled &&
          (p.provider_key.toLowerCase().includes("figma") ||
            p.provider_type.toLowerCase().includes("figma") ||
            p.provider_name.toLowerCase().includes("figma"))
      ),
    [allProviders]
  );

  const selectedProvider = useMemo(
    () => figmaProviders.find((p) => p.id === selectedProviderId),
    [figmaProviders, selectedProviderId]
  );

  const handleReset = () => {
    setStep("provider");
    setSelectedProviderId("");
    setImportType("page_frame");
    setExternalReference("");
    setImportResult(null);
    setTitle("");
    setSlug("");
    setError(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const handleImport = async () => {
    if (!selectedProviderId || !externalReference.trim()) return;

    setError(null);
    setStep("generating");

    try {
      console.log(
        `[FIGMA_MCP] figma_mcp_import_started workspace_id=${workspaceId} provider_id=${selectedProviderId} reference=${externalReference}`
      );

      const result = await importMutation.mutateAsync({
        provider_id: selectedProviderId,
        import_type: importType,
        external_reference: externalReference.trim(),
      });

      if (result.status === "completed" && result.normalized) {
        console.log(
          `[FIGMA_MCP] figma_mcp_import_succeeded workspace_id=${workspaceId} provider_id=${selectedProviderId} import_id=${result.import_id} sections=${result.normalized.metadata?.section_count}`
        );

        setImportResult({
          import_id: result.import_id,
          normalized: result.normalized as NormalizedPayload,
        });

        // Auto-fill title from source
        const sourceName = result.normalized.source?.reference || externalReference;
        const autoTitle = `Página Figma — ${sourceName.slice(0, 40)}`;
        setTitle(autoTitle);
        setSlug(
          autoTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50)
        );

        setStep("preview");
      } else {
        console.warn(
          `[FIGMA_MCP] figma_mcp_import_failed workspace_id=${workspaceId} provider_id=${selectedProviderId} error=${result.error}`
        );
        setError(result.error || "Falha na importação");
        setStep("import");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[FIGMA_MCP] figma_mcp_import_failed workspace_id=${workspaceId} provider_id=${selectedProviderId} error=${msg}`
      );
      setError(msg);
      setStep("import");
    }
  };

  const handleGenerate = async () => {
    if (!importResult) return;

    setError(null);
    setStep("generating");

    try {
      console.log(
        `[FIGMA_MCP] landing_page_generation_from_figma_started workspace_id=${workspaceId} provider_id=${selectedProviderId} import_id=${importResult.import_id}`
      );

      const result = await generatePage.mutateAsync({
        import_id: importResult.import_id,
        title: title || undefined,
        slug: slug || undefined,
      });

      console.log(
        `[FIGMA_MCP] landing_page_generation_from_figma_succeeded workspace_id=${workspaceId} provider_id=${selectedProviderId} import_id=${importResult.import_id} page_id=${result.page_id}`
      );

      setStep("done");

      // Navigate to builder
      setTimeout(() => {
        onGenerated?.(result.page_id);
        handleClose(false);
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[FIGMA_MCP] landing_page_generation_from_figma_failed workspace_id=${workspaceId} provider_id=${selectedProviderId} import_id=${importResult?.import_id} error=${msg}`
      );
      setError(msg);
      setStep("preview");
    }
  };

  const isLoading = step === "generating";
  const normalized = importResult?.normalized;

  const stepTitles: Record<Step, string> = {
    provider: "Gerar Landing Page via Figma MCP",
    import: "Importar contexto do Figma",
    preview: "Preview & Configurar",
    generating: "A processar...",
    done: "Landing Page gerada!",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Figma className="h-5 w-5" />
            {stepTitles[step]}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Provider Selection */}
        {step === "provider" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um provider Figma MCP configurado para importar contexto de design e gerar uma landing page.
            </p>

            {figmaProviders.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Nenhum provider Figma MCP configurado.
                </p>
                <p className="text-xs text-muted-foreground">
                  Configure um provider Figma em Marketing → Integrações MCP.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {figmaProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProviderId(p.id)}
                    className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                      selectedProviderId === p.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/30"
                    }`}
                  >
                    <Figma className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.provider_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.server_url}</p>
                    </div>
                    <Badge
                      variant={p.connection_status === "connected" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {p.connection_status === "connected" ? "Ligado" : p.connection_status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Import */}
        {step === "import" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Figma className="h-4 w-4" />
              <span>{selectedProvider?.provider_name}</span>
            </div>

            <div className="space-y-2">
              <Label>Tipo de importação</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL ou referência do Figma</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  placeholder="https://www.figma.com/design/XXXXX/..."
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cole a URL do ficheiro Figma ou insira a file key directamente.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && normalized && (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {/* Metadata badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <LayoutGrid className="h-3 w-3" />
                  {normalized.metadata?.section_count || 0} secções
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Palette className="h-3 w-3" />
                  {normalized.metadata?.color_count || 0} cores
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Type className="h-3 w-3" />
                  {normalized.metadata?.typography_count || 0} tipografias
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {normalized.metadata?.component_count || 0} componentes
                </Badge>
              </div>

              {/* Detected sections */}
              <div>
                <p className="text-sm font-medium mb-2">Secções detectadas:</p>
                <div className="space-y-1">
                  {normalized.sections?.map((sec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 border rounded-lg text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">
                          {SECTION_TYPE_ICONS[sec.section_type] || "📋"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {SECTION_TYPE_LABELS[sec.section_type] || sec.section_type}
                        </Badge>
                        <span className="text-muted-foreground truncate max-w-[160px]">
                          {sec.section_name}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color tokens */}
              {Object.keys(normalized.tokens?.colors || {}).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tokens de cor:</p>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(normalized.tokens.colors)
                      .slice(0, 16)
                      .map(([name, hex]) => (
                        <div
                          key={name}
                          className="w-7 h-7 rounded border"
                          style={{ backgroundColor: hex }}
                          title={`${name}: ${hex}`}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Title and slug configuration */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Configuração da página:</p>
                <div className="space-y-2">
                  <Label htmlFor="figma-title">Título</Label>
                  <Input
                    id="figma-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                          .slice(0, 50)
                      );
                    }}
                    placeholder="Ex: Landing de Captação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="figma-slug">Slug</Label>
                  <Input
                    id="figma-slug"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">A processar...</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-sm font-medium">Landing page gerada com sucesso!</p>
            <p className="text-xs text-muted-foreground">A abrir no editor...</p>
          </div>
        )}

        {/* Footer */}
        {step !== "generating" && step !== "done" && (
          <DialogFooter className="flex justify-between">
            <div>
              {step !== "provider" && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    if (step === "import") setStep("provider");
                    if (step === "preview") setStep("import");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>

              {step === "provider" && (
                <Button
                  onClick={() => setStep("import")}
                  disabled={!selectedProviderId}
                >
                  Seguinte
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}

              {step === "import" && (
                <Button
                  onClick={handleImport}
                  disabled={!externalReference.trim() || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A importar...
                    </>
                  ) : (
                    <>
                      Importar
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              )}

              {step === "preview" && (
                <Button onClick={handleGenerate} disabled={generatePage.isPending}>
                  {generatePage.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A gerar...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Gerar Landing Page
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
