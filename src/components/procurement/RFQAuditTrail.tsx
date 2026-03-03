import { useRFQAuditLog } from "@/hooks/useRFQAuditLog";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  status: "Estado",
  due_date: "Data Limite",
  notes: "Notas",
  currency: "Moeda",
  payment_terms: "Condições Pagamento",
  delivery_location: "Local de Entrega",
  quote_validity_days: "Validade (dias)",
  incoterm: "Incoterm",
  buyer_name: "Comprador",
  buyer_email: "Email Comprador",
  project_id: "Projeto",
};

interface Props {
  rfqId: string;
}

export function RFQAuditTrail({ rfqId }: Props) {
  const { data: logs = [], isLoading } = useRFQAuditLog(rfqId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem alterações registadas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Alterações
          <Badge variant="secondary" className="ml-auto">
            {logs.length} {logs.length === 1 ? "registo" : "registos"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: "400px" }}>
          <div className="px-4 pb-4 space-y-4">
            {logs.map((log, index) => {
              const label = FIELD_LABELS[log.field_name] || log.field_name;
              const email = (log.profile as any)?.email;
              const oldStr = log.old_value != null ? String(log.old_value).replace(/^"|"$/g, "") : "—";
              const newStr = log.new_value != null ? String(log.new_value).replace(/^"|"$/g, "") : "—";
              const isFirst = index === 0;

              return (
                <div
                  key={log.id}
                  className={cn(
                    "relative pl-6 pb-4",
                    !isFirst && "border-l border-border ml-2"
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 w-4 h-4 rounded-full border-2 bg-background",
                      isFirst ? "border-primary" : "border-muted-foreground"
                    )}
                    style={{ transform: "translateX(-50%)" }}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.changed_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                      </span>
                    </div>
                    {email && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {email}
                      </div>
                    )}
                    <div className="text-xs mt-1">
                      <span className="line-through opacity-60">{oldStr}</span>
                      {" → "}
                      <span className="font-medium text-primary">{newStr}</span>
                    </div>
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
