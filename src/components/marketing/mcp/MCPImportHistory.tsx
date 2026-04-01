import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  RefreshCw,
  FileText,
  Layers,
} from "lucide-react";
import { useMCPImports, useMCPImportDetail, type NormalizedPayload } from "@/hooks/useMarketingMCP";
import { MCPImportResult } from "./MCPImportResult";
import { MCPGenerateDialog } from "./MCPGenerateDialog";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-600", label: "Pendente" },
  processing: { icon: Loader2, color: "text-blue-600", label: "A processar" },
  completed: { icon: CheckCircle2, color: "text-green-600", label: "Concluído" },
  failed: { icon: XCircle, color: "text-red-600", label: "Falhou" },
};

const IMPORT_TYPE_LABELS: Record<string, string> = {
  design_system: "Design System",
  page_frame: "Frame de Página",
  section: "Secção",
  component: "Componente",
  tokens: "Tokens",
};

interface MCPImportHistoryProps {
  workspaceId: string;
}

export function MCPImportHistory({ workspaceId }: MCPImportHistoryProps) {
  const { data: imports, isLoading, refetch } = useMCPImports(workspaceId);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detailRecord } = useMCPImportDetail(workspaceId, detailId || undefined);
  const [generateImportId, setGenerateImportId] = useState<string | null>(null);
  const [generateTarget, setGenerateTarget] = useState<"page" | "funnel">("page");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Importações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!imports || imports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Importações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Download className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma importação realizada</p>
            <p className="text-xs mt-1">
              Use o botão "Importar" para trazer contexto de um servidor MCP.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Histórico de Importações</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              {imports.map((record) => {
                const statusCfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                const meta = record.normalized_payload_json?.metadata as Record<string, number> | undefined;

                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate max-w-[180px]">
                            {record.external_reference_name || record.external_reference_id || "—"}
                          </p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {IMPORT_TYPE_LABELS[record.import_type] || record.import_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(record.created_at), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </p>
                          {meta && record.status === "completed" && (
                            <p className="text-xs text-muted-foreground">
                              · {meta.section_count ?? 0} secções · {meta.component_count ?? 0} componentes
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`${statusCfg.color} bg-transparent border-0`}
                      >
                        <StatusIcon className={`h-3 w-3 mr-1 ${record.status === "processing" ? "animate-spin" : ""}`} />
                        {statusCfg.label}
                      </Badge>
                      {record.status === "completed" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDetailId(record.id)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setGenerateImportId(record.id);
                              setGenerateTarget("page");
                            }}
                            title="Gerar Landing Page"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setGenerateImportId(record.id);
                              setGenerateTarget("funnel");
                            }}
                            title="Gerar Funil"
                          >
                            <Layers className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da Importação</DialogTitle>
          </DialogHeader>
          {detailRecord?.normalized_payload_json && (
            <MCPImportResult
              normalized={detailRecord.normalized_payload_json as unknown as NormalizedPayload}
            />
          )}
          {detailRecord?.error_message && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{detailRecord.error_message}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate dialog */}
      <MCPGenerateDialog
        open={!!generateImportId}
        onOpenChange={(open) => !open && setGenerateImportId(null)}
        workspaceId={workspaceId}
        defaultTarget={generateTarget}
        preselectedImportId={generateImportId || undefined}
      />
    </>
  );
}
