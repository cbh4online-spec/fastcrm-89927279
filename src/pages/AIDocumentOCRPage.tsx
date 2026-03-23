import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Upload,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  RotateCw,
  Trash2,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ScanText,
  FileUp,
  BarChart3,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentProcessing, DocumentJob, JobStatus } from "@/hooks/useDocumentProcessing";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ProductionGuideSection, ProductionGuideConfig } from "@/components/shared/ProductionGuideSection";

// ============================================================================
// STATUS HELPERS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-muted-foreground" },
  processing: { label: "A processar", icon: Loader2, color: "text-primary" },
  ocr: { label: "OCR", icon: ScanText, color: "text-primary" },
  classifying: { label: "A classificar", icon: FileText, color: "text-primary" },
  extracting: { label: "A extrair", icon: FileUp, color: "text-primary" },
  embedding: { label: "A indexar", icon: BarChart3, color: "text-primary" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "text-primary" },
  failed: { label: "Falhado", icon: AlertTriangle, color: "text-destructive" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-muted-foreground" },
};

const TYPE_LABELS: Record<string, string> = {
  invoice: "Factura",
  contract: "Contrato",
  proposal: "Proposta",
  receipt: "Recibo",
  report: "Relatório",
  form: "Formulário",
  letter: "Carta",
  id_document: "Documento ID",
  certificate: "Certificado",
  other: "Outro",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const isAnimated = ["processing", "ocr", "classifying", "extracting", "embedding"].includes(status);

  return (
    <Badge variant="outline" className={cn("gap-1", cfg.color)}>
      <Icon className={cn("h-3 w-3", isAnimated && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}

function ConfidenceMeter({ value, label }: { value: number | null; label?: string }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}:</span>}
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-yellow-500" : "bg-destructive"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium">{pct}%</span>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// UPLOAD DROPZONE
// ============================================================================

function DocumentUploader({
  onUpload,
  isUploading,
  onClose,
}: {
  onUpload: (params: { file: File }) => Promise<unknown>;
  isUploading: boolean;
  onClose: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      for (const file of Array.from(files)) {
        const validTypes = [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/tiff",
          "image/gif",
          "image/bmp",
        ];
        if (!validTypes.includes(file.type)) {
          continue;
        }
        if (file.size > 50 * 1024 * 1024) {
          continue;
        }
        await onUpload({ file });
      }
      onClose();
    },
    [onUpload, onClose]
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Carregar Documento
          </DialogTitle>
          <DialogDescription>
            PDF, PNG, JPEG, WebP, TIFF, GIF, BMP — até 50MB
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.png,.jpg,.jpeg,.webp,.tiff,.gif,.bmp";
            input.multiple = true;
            input.onchange = () => handleFiles(input.files);
            input.click();
          }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A processar...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste ficheiros ou clique para seleccionar</p>
              <p className="text-xs text-muted-foreground">
                Suporta PDFs e imagens
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// JOB DETAIL DIALOG
// ============================================================================

function JobDetailDialog({
  job,
  onClose,
  onReprocess,
  onDelete,
}: {
  job: DocumentJob;
  onClose: () => void;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const exportData = (format: "json" | "csv") => {
    const data = {
      document_info: {
        file_name: job.file_name,
        document_type: job.document_type,
        processed_at: job.completed_at,
      },
      extracted_data: job.extracted_data,
      entities: job.extracted_entities,
    };

    let blob: Blob;
    let filename: string;

    if (format === "json") {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      filename = `${job.file_name.replace(/\.[^.]+$/, "")}_extracted.json`;
    } else {
      const rows = ["Campo,Valor"];
      for (const [key, value] of Object.entries(job.extracted_data || {})) {
        const val = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        rows.push(`"${key}","${val.replace(/"/g, '""')}"`);
      }
      blob = new Blob([rows.join("\n")], { type: "text/csv" });
      filename = `${job.file_name.replace(/\.[^.]+$/, "")}_extracted.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                {job.file_name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <StatusBadge status={job.status} />
                {job.document_type && (
                  <Badge variant="secondary">{TYPE_LABELS[job.document_type] || job.document_type}</Badge>
                )}
              </div>
            </div>
            <DialogDescription className="flex items-center gap-4 text-xs">
              <span>{formatFileSize(job.file_size)}</span>
              <span>·</span>
              <span>{format(new Date(job.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</span>
              {job.ocr_duration_ms && (
                <>
                  <span>·</span>
                  <span>OCR: {(job.ocr_duration_ms / 1000).toFixed(1)}s</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Progress */}
              {job.status !== "completed" && job.status !== "failed" && job.status !== "cancelled" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span>{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                </div>
              )}

              {/* Error */}
              {job.error_message && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{job.error_message}</p>
                </div>
              )}

              {/* Confidence */}
              {job.status === "completed" && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <ConfidenceMeter value={job.ocr_confidence} label="OCR" />
                  </Card>
                  <Card className="p-3">
                    <ConfidenceMeter value={job.classification_confidence} label="Classificação" />
                  </Card>
                  <Card className="p-3">
                    <ConfidenceMeter value={job.extraction_confidence} label="Extracção" />
                  </Card>
                </div>
              )}

              {/* Classification Reasoning */}
              {job.classification_reasoning && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Classificação</h4>
                  <p className="text-sm">{job.classification_reasoning}</p>
                </div>
              )}

              {/* Extracted Data */}
              {job.extracted_data && Object.keys(job.extracted_data).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Dados Extraídos</h4>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => exportData("json")}>
                        <Download className="h-3 w-3 mr-1" /> JSON
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => exportData("csv")}>
                        <Download className="h-3 w-3 mr-1" /> CSV
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    {Object.entries(job.extracted_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium text-right max-w-[60%] truncate">
                          {value === null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entities */}
              {job.extracted_entities && job.extracted_entities.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Entidades ({job.extracted_entities.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.extracted_entities.map((entity, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <span className="text-muted-foreground mr-1">{entity.type}:</span>
                        {entity.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* OCR Text preview */}
              {job.ocr_text && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Texto Extraído (OCR)</h4>
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                    {job.ocr_text.slice(0, 3000)}
                    {job.ocr_text.length > 3000 && "\n\n... (truncado)"}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between pt-2 border-t">
            <div className="flex gap-2">
              {(job.status === "failed" || job.status === "completed") && (
                <Button size="sm" variant="outline" onClick={() => onReprocess(job.id)}>
                  <RotateCw className="h-3.5 w-3.5 mr-1" /> Reprocessar
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O ficheiro e todos os dados extraídos serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(job.id);
                onClose();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// JOB CARD
// ============================================================================

function JobCard({
  job,
  onView,
  onReprocess,
  onCancel,
  onDelete,
}: {
  job: DocumentJob;
  onView: () => void;
  onReprocess: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isProcessing = !["completed", "failed", "cancelled"].includes(job.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={onView}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{job.file_name}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={job.status} />
                {job.document_type && (
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[job.document_type] || job.document_type}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(job.file_size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pt })}
                </span>
              </div>

              {isProcessing && (
                <Progress value={job.progress} className="h-1 mt-2" />
              )}

              {job.status === "completed" && job.extracted_data && Object.keys(job.extracted_data).length > 0 && (
                <div className="flex gap-3 mt-2">
                  <ConfidenceMeter value={job.ocr_confidence} label="OCR" />
                  <ConfidenceMeter value={job.classification_confidence} label="Class" />
                </div>
              )}

              {job.error_message && (
                <p className="text-xs text-destructive mt-1 truncate">{job.error_message}</p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                  <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                </DropdownMenuItem>
                {(job.status === "failed" || job.status === "completed") && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReprocess(job.id); }}>
                    <RotateCw className="h-4 w-4 mr-2" /> Reprocessar
                  </DropdownMenuItem>
                )}
                {isProcessing && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCancel(job.id); }}>
                    <XCircle className="h-4 w-4 mr-2" /> Cancelar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// PRODUCTION GUIDE CONFIG
// ============================================================================

const productionGuide: ProductionGuideConfig = {
  moduleName: "Document Intelligence",
  dataChecklist: [
    { label: "Bucket de armazenamento configurado", done: true, hint: "document-intelligence" },
    { label: "Tabela document_processing_jobs criada", done: true },
    { label: "Tabela document_extraction_templates criada", done: true },
    { label: "Edge function document-intelligence-process", done: true },
    { label: "Templates de extracção customizados", done: false, hint: "Crie templates para os tipos de documento mais comuns" },
    { label: "Integração com Knowledge Base", done: true, hint: "Documentos processados são indexados automaticamente" },
  ],
  automations: [
    { name: "OCR Automático", active: true, description: "Extrai texto de PDFs e imagens via IA Vision" },
    { name: "Classificação IA", active: true, description: "Identifica tipo de documento automaticamente" },
    { name: "Extracção Estruturada", active: true, description: "Extrai campos específicos por tipo de documento" },
    { name: "Indexação Semântica", active: true, description: "Indexa no Knowledge Base para pesquisa RAG" },
  ],
  kpis: [
    { label: "Taxa de Sucesso", description: "% de documentos processados com sucesso" },
    { label: "Confiança Média", description: "Score médio de confiança OCR/classificação/extracção" },
    { label: "Tempo de Processamento", description: "Tempo médio por documento" },
    { label: "Volume Mensal", description: "Documentos processados nos últimos 30 dias" },
  ],
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AIDocumentOCRPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [showUploader, setShowUploader] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DocumentJob | null>(null);

  const {
    jobs,
    isLoading,
    stats,
    uploadDocument,
    isUploading,
    reprocessDocument,
    cancelJob,
    deleteJob,
    refetch,
  } = useDocumentProcessing();

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        job.file_name.toLowerCase().includes(q) ||
        job.document_type?.toLowerCase().includes(q) ||
        job.ocr_text?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanText className="h-6 w-6 text-primary" />
              Document Intelligence
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              OCR, classificação e extracção inteligente de documentos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            <Button size="sm" onClick={() => setShowUploader(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Carregar
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                <p className="text-2xl font-bold">{stats.last30Days}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-primary">{stats.successRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Em Processamento</p>
                <p className="text-2xl font-bold">
                  {(stats.byStatus.pending || 0) +
                    (stats.byStatus.processing || 0) +
                    (stats.byStatus.ocr || 0) +
                    (stats.byStatus.classifying || 0) +
                    (stats.byStatus.extracting || 0) +
                    (stats.byStatus.embedding || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="failed">Falhado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ScanText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum documento</p>
              <p className="text-sm text-muted-foreground mt-1">
                Carregue o primeiro documento para começar
              </p>
              <Button size="sm" className="mt-4" onClick={() => setShowUploader(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Carregar Documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={() => setSelectedJob(job)}
                  onReprocess={reprocessDocument}
                  onCancel={cancelJob}
                  onDelete={deleteJob}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Type Distribution */}
        {stats && stats.byType && Object.keys(stats.byType).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="gap-1">
                    {TYPE_LABELS[type] || type}
                    <span className="font-bold">{count}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Production Guide */}
        <ProductionGuideSection config={productionGuide} />
      </div>

      {/* Upload Dialog */}
      {showUploader && (
        <DocumentUploader
          onUpload={uploadDocument}
          isUploading={isUploading}
          onClose={() => setShowUploader(false)}
        />
      )}

      {/* Detail Dialog */}
      {selectedJob && (
        <JobDetailDialog
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onReprocess={(id) => {
            reprocessDocument(id);
            setSelectedJob(null);
          }}
          onDelete={(id) => {
            deleteJob(id);
            setSelectedJob(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
