import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Building2,
  Package,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useImportHistory } from "@/hooks/useImportHistory";

const TYPE_ICONS: Record<string, React.ElementType> = {
  contacts: Users,
  companies: Building2,
  products: Package,
  leads: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  contacts: 'Contactos',
  companies: 'Empresas',
  products: 'Produtos',
  leads: 'Leads',
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-600', label: 'Pendente' },
  processing: { icon: RefreshCw, color: 'text-blue-600', label: 'A processar' },
  complete: { icon: CheckCircle2, color: 'text-green-600', label: 'Concluído' },
  error: { icon: XCircle, color: 'text-red-600', label: 'Erro' },
};

export function ImportHistory() {
  const { data: history, isLoading, refetch } = useImportHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Importações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Importações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma importação realizada</p>
            <p className="text-xs mt-1">
              As tuas importações aparecerão aqui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Importações Recentes</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {history.map((record) => {
              const TypeIcon = TYPE_ICONS[record.import_type] || FileSpreadsheet;
              const statusConfig = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {record.file_name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[record.import_type] || record.import_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(record.created_at), {
                          addSuffix: true,
                          locale: pt,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs">
                      {record.success_count > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {record.success_count}
                        </span>
                      )}
                      {record.error_count > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" />
                          {record.error_count}
                        </span>
                      )}
                      {record.skip_count > 0 && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          {record.skip_count}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <Badge
                      variant="secondary"
                      className={`${statusConfig.color} bg-transparent border-0`}
                    >
                      <StatusIcon className={`h-3 w-3 mr-1 ${record.status === 'processing' ? 'animate-spin' : ''}`} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
