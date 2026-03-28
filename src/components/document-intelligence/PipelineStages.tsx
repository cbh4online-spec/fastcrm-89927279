import { cn } from "@/lib/utils";
import { Upload, ScanText, Tags, FileOutput, Database, ChevronRight, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ============================================================================
// PIPELINE HEADER — Visual 5-step banner
// ============================================================================

const PIPELINE_STEPS = [
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    description: "Carregamento do ficheiro (PDF, imagem)",
  },
  {
    id: "ocr",
    label: "OCR",
    icon: ScanText,
    description: "Extracção de texto via IA Vision (Gemini 2.5 Pro)",
  },
  {
    id: "classification",
    label: "Classificação",
    icon: Tags,
    description: "Identificação automática do tipo de documento",
  },
  {
    id: "extraction",
    label: "Extracção",
    icon: FileOutput,
    description: "Extracção de campos estruturados por template",
  },
  {
    id: "indexation",
    label: "Indexação KB",
    icon: Database,
    description: "Indexação semântica na Base de Conhecimento (RAG)",
  },
];

export function PipelineHeader() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-xl border border-border/60 bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors cursor-default">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{step.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">{step.description}</p>
                  </TooltipContent>
                </Tooltip>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// MINI PIPELINE — Per-document stage indicator
// ============================================================================

const STATUS_TO_STAGE: Record<string, number> = {
  pending: 0,
  processing: 1,
  ocr: 1,
  classifying: 2,
  extracting: 3,
  embedding: 4,
  completed: 5,
  failed: -1,
  cancelled: -1,
};

const MINI_STEPS = [
  { label: "Upload", shortLabel: "Up" },
  { label: "OCR", shortLabel: "OCR" },
  { label: "Class", shortLabel: "Cls" },
  { label: "Extrac", shortLabel: "Ext" },
  { label: "Index", shortLabel: "Idx" },
];

export function MiniPipelineStages({ status }: { status: string }) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;
  const isFailed = status === "failed" || status === "cancelled";

  return (
    <div className="flex items-center gap-0.5">
      {MINI_STEPS.map((step, i) => {
        const isComplete = currentStage > i;
        const isActive = currentStage === i && !isFailed;
        const isPending = currentStage < i || isFailed;

        return (
          <div key={i} className="flex items-center gap-0.5">
            <div
              className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                isComplete && "bg-primary/15 text-primary",
                isActive && "bg-primary/20 text-primary ring-1 ring-primary/30",
                isPending && "bg-muted/50 text-muted-foreground/50"
              )}
            >
              {isActive && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {isComplete && <span className="text-[9px]">✓</span>}
              <span>{step.shortLabel}</span>
            </div>
            {i < MINI_STEPS.length - 1 && (
              <span className={cn(
                "text-[8px]",
                isComplete ? "text-primary/40" : "text-muted-foreground/20"
              )}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// EMPTY STATE — Onboarding with pipeline explanation
// ============================================================================

export function DocumentEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border/60 p-8 md:p-12">
      <div className="max-w-xl mx-auto text-center space-y-6">
        {/* Pipeline visual */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{step.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 mb-4" />
                )}
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="text-lg font-semibold">Pipeline Inteligente de Documentos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Carregue um documento e o sistema processa automaticamente em 5 etapas: 
            extrai texto via OCR, classifica o tipo, extrai dados estruturados e indexa na Base de Conhecimento.
          </p>
        </div>

        {/* Supported formats */}
        <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold mb-1">📄 PDFs</p>
            <p className="text-[11px] text-muted-foreground">Facturas, contratos, propostas</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold mb-1">🖼️ Imagens</p>
            <p className="text-[11px] text-muted-foreground">PNG, JPEG, WebP, TIFF, BMP</p>
          </div>
        </div>

        {/* Examples */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Exemplo:</strong> Factura PDF → extrai NIF, total, data, fornecedor automaticamente</p>
          <p><strong>Exemplo:</strong> Contrato → identifica partes, datas, cláusulas-chave</p>
        </div>

        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Carregar Primeiro Documento
        </button>
      </div>
    </div>
  );
}
