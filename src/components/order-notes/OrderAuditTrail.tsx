import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Clock } from "lucide-react";
import type { OrderAuditLog } from "@/types/order-audit";
import { auditActionLabels, formatChangedField } from "@/types/order-audit";
import { cn } from "@/lib/utils";

interface OrderAuditTrailProps {
  orderId: string;
  maxHeight?: string;
}

export function OrderAuditTrail({ orderId, maxHeight = "400px" }: OrderAuditTrailProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["order-audit-logs", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_audit_log")
        .select("*")
        .eq("order_note_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderAuditLog[];
    },
    enabled: !!orderId,
  });

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
        <ScrollArea style={{ height: maxHeight }}>
          <div className="px-4 pb-4 space-y-4">
            {logs.map((log, index) => (
              <AuditLogEntry key={log.id} log={log} isFirst={index === 0} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AuditLogEntry({ log, isFirst }: { log: OrderAuditLog; isFirst: boolean }) {
  const actionConfig = auditActionLabels[log.action] || {
    label: log.action,
    labelPT: log.action,
    color: "text-muted-foreground",
  };

  return (
    <div className={cn(
      "relative pl-6 pb-4",
      !isFirst && "border-l border-border ml-2"
    )}>
      {/* Timeline dot */}
      <div className={cn(
        "absolute left-0 top-0 w-4 h-4 rounded-full border-2 bg-background",
        isFirst ? "border-primary" : "border-muted-foreground"
      )} style={{ transform: "translateX(-50%)" }} />
      
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-xs", actionConfig.color)}>
            {actionConfig.labelPT}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
          </span>
        </div>

        {/* User */}
        {log.user_email && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.user_email}
          </div>
        )}

        {/* Changed fields */}
        {log.changed_fields && log.changed_fields.length > 0 && (
          <div className="text-xs mt-2">
            <span className="text-muted-foreground">Campos alterados: </span>
            {log.changed_fields.map((field, i) => (
              <span key={field}>
                <span className="font-medium">{formatChangedField(field)}</span>
                {i < log.changed_fields!.length - 1 && ", "}
              </span>
            ))}
          </div>
        )}

        {/* Status change details */}
        {log.action === 'update' && log.old_value && log.new_value && 
         'status' in (log.old_value as object) && 
         (log.old_value as Record<string, unknown>).status !== (log.new_value as Record<string, unknown>).status && (
          <div className="text-xs mt-1">
            <span className="text-muted-foreground">Estado: </span>
            <span className="line-through opacity-60">
              {String((log.old_value as Record<string, unknown>).status)}
            </span>
            {" → "}
            <span className="font-medium text-primary">
              {String((log.new_value as Record<string, unknown>).status)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
