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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileText,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Palette,
  Type,
  LayoutGrid,
} from "lucide-react";
import {
  useMCPImports,
  useGeneratePageFromMCP,
  useGenerateFunnelFromMCP,
  type MCPImportRecord,
  type NormalizedPayload,
} from "@/hooks/useMarketingMCP";

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  cta: "CTA",
  faq: "FAQ",
  pricing: "Preços",
  social_proof: "Prova Social",
  footer: "Rodapé",
  navigation: "Navegação",
  form: "Formulário",
  benefits: "Benefícios",
  thank_you: "Agradecimento",
  upsell: "Upsell",
  webinar: "Webinar",
  content: "Conteúdo",
};

interface MCPGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  defaultTarget?: "page" | "funnel";
  preselectedImportId?: string;
  onGenerated?: (type: "page" | "funnel", id: string) => void;
}

export function MCPGenerateDialog({
  open,
  onOpenChange,
  workspaceId,
  defaultTarget,
  preselectedImportId,
  onGenerated,
}: MCPGenerateDialogProps) {
  const { data: imports } = useMCPImports(workspaceId);
  const generatePage = useGeneratePageFromMCP(workspaceId);
  const generateFunnel = useGenerateFunnelFromMCP(workspaceId);

  const [step, setStep] = useState(0);
  const [selectedImportId, setSelectedImportId] = useState(preselectedImportId || "");
  const [target, setTarget] = useState<"page" | "funnel">(defaultTarget || "page");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  const completedImports = useMemo(
    () => (imports || []).filter((i) => i.status === "completed"),
    [imports]
  );

  const selectedImport = useMemo(
    () => completedImports.find((i) => i.id === selectedImportId),
    [completedImports, selectedImportId]
  );

  const normalized = selectedImport?.normalized_payload_json as unknown as NormalizedPayload | undefined;

  const handleReset = () => {
    setStep(0);
    setSelectedImportId(preselectedImportId || "");
    setTarget(defaultTarget || "page");
    setTitle("");
    setSlug("");
  };

  const handleClose = (open: boolean) => {
    if (!open) handleReset();
    onOpenChange(open);
  };

  const handleGenerate = async () => {
    const isPage = target === "page";
    try {
      const result = isPage
        ? await generatePage.mutateAsync({
            import_id: selectedImportId,
            title: title || undefined,
            slug: slug || undefined,
          })
        : await generateFunnel.mutateAsync({
            import_id: selectedImportId,
            name: title || undefined,
            slug: slug || undefined,
          });

      const assetId = isPage ? result.page_id : result.funnel_id;
      onGenerated?.(target, assetId);
      handleClose(false);
    } catch {
      // error handled by hook
    }
  };

  const isGenerating = generatePage.isPending || generateFunnel.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 0 && "Gerar a partir de MCP"}
            {step === 1 && "Configurar Geração"}
            {step === 2 && "Preview & Confirmar"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 0: Choose import */}
        {step === 0 && (
          <div className="space-y-4">
            <Label>Importação de origem</Label>
            {completedImports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma importação concluída disponível. Importe contexto MCP primeiro.
              </p>
            ) : (
              <Select value={selectedImportId} onValueChange={setSelectedImportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar importação..." />
                </SelectTrigger>
                <SelectContent>
                  {completedImports.map((imp) => {
                    const meta = imp.normalized_payload_json?.metadata as Record<string, number> | undefined;
                    return (
                      <SelectItem key={imp.id} value={imp.id}>
                        <span className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">
                            {imp.external_reference_name || imp.external_reference_id || imp.id.slice(0, 8)}
                          </span>
                          {meta && (
                            <span className="text-xs text-muted-foreground">
                              ({meta.section_count} secções)
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {normalized && (
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
              </div>
            )}
          </div>
        )}

        {/* Step 1: Choose target + title */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Tipo de geração</Label>
              <RadioGroup
                value={target}
                onValueChange={(v) => setTarget(v as "page" | "funnel")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3 flex-1 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="page" />
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Landing Page</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3 flex-1 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="funnel" />
                  <Layers className="h-4 w-4" />
                  <span className="text-sm font-medium">Funil</span>
                </label>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="gen-title">
                {target === "page" ? "Título da página" : "Nome do funil"}
              </Label>
              <Input
                id="gen-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug || slug.startsWith("mcp-")) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                        || `mcp-${target}-${Date.now()}`
                    );
                  }
                }}
                placeholder={target === "page" ? "Ex: Landing de Captação" : "Ex: Funil de Lançamento"}
              />
            </div>
            <div>
              <Label htmlFor="gen-slug">Slug</Label>
              <Input
                id="gen-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && normalized && (
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Origem:</span>
                  <p className="font-medium truncate">
                    {selectedImport?.external_reference_name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target:</span>
                  <p className="font-medium">
                    {target === "page" ? "Landing Page" : "Funil"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Título:</span>
                  <p className="font-medium">{title || "(auto)"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Slug:</span>
                  <p className="font-medium">{slug || "(auto)"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Secções detectadas:</p>
                <div className="space-y-1">
                  {normalized.sections?.map((sec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-1.5 border rounded text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {SECTION_TYPE_LABELS[sec.section_type] || sec.section_type}
                        </Badge>
                        <span className="text-muted-foreground truncate max-w-[180px]">
                          {sec.section_name}
                        </span>
                      </span>
                      {target === "funnel" && (
                        <span className="text-xs text-muted-foreground">
                          Step {i + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(normalized.tokens?.colors || {}).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tokens de cor:</p>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(normalized.tokens.colors).slice(0, 12).map(([name, hex]) => (
                      <div
                        key={name}
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: hex }}
                        title={`${name}: ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isGenerating}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            {step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !selectedImportId}
              >
                Seguinte
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Gerar {target === "page" ? "Página" : "Funil"}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}