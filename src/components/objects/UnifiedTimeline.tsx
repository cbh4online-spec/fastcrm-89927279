import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  entityId?: string;
  entityType?: string;
  limit?: number;
}

interface ActivityLog {
  id: string;
  action: string;
  table_name: string;
  module: string | null;
  created_at: string;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
}

export function UnifiedTimeline({ entityId, entityType, limit = 20 }: TimelineProps) {
  const { currentWorkspace } = useWorkspace();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-timeline", currentWorkspace?.id, entityId, entityType],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      let query = (supabase
        .from("activity_logs")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entityId) {
        query = query.eq("record_id", entityId);
      }
      if (entityType) {
        query = query.eq("table_name", entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityLog[];
    },
    enabled: !!currentWorkspace,
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case "INSERT": return "Created";
      case "UPDATE": return "Updated";
      case "DELETE": return "Deleted";
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-emerald-500";
      case "UPDATE": return "bg-primary";
      case "DELETE": return "bg-destructive";
      default: return "bg-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-1.5">
                    <div className={cn("w-2 h-2 rounded-full", getActionColor(log.action))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{getActionLabel(log.action)}</span>
                      {" "}
                      <span className="text-muted-foreground">{log.table_name}</span>
                      {log.changed_fields && log.changed_fields.length > 0 && (
                        <span className="text-muted-foreground">
                          {" "}· {log.changed_fields.join(", ")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: pt })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
