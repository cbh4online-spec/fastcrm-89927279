import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefreshCw, Pencil, Trash2, ChevronDown, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { SupplierFeed, useSupplierFeedLogs } from "@/hooks/useSupplierFeeds";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  feed: SupplierFeed;
  isSyncing: boolean;
  onSync: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SupplierFeedCard({ feed, isSyncing, onSync, onEdit, onDelete }: Props) {
  const [showLogs, setShowLogs] = useState(false);
  const { data: logs = [] } = useSupplierFeedLogs(showLogs ? feed.id : undefined);

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    completed: { color: "bg-emerald-500/10 text-emerald-600", icon: <CheckCircle2 className="h-3 w-3" />, label: "OK" },
    failed: { color: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3 w-3" />, label: "Erro" },
    running: { color: "bg-amber-500/10 text-amber-600", icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "A sincronizar" },
  };

  const status = feed.last_sync_status ? statusConfig[feed.last_sync_status] : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{feed.feed_name}</h4>
              {status && (
                <Badge variant="secondary" className={`text-xs gap-1 ${status.color}`}>
                  {status.icon} {status.label}
                </Badge>
              )}
              {!feed.last_sync_at && (
                <Badge variant="secondary" className="text-xs text-muted-foreground">Nunca sincronizado</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-sm">{feed.feed_url}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              {feed.last_sync_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(feed.last_sync_at), { addSuffix: true, locale: pt })}
                </span>
              )}
              {feed.last_sync_rows > 0 && (
                <span>{feed.last_sync_rows} linhas</span>
              )}
              {feed.auto_sync_enabled && (
                <Badge variant="outline" className="text-xs">Auto: {feed.sync_interval_hours}h</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={onSync} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1 hidden sm:inline">Sincronizar</span>
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Logs collapsible */}
        <Collapsible open={showLogs} onOpenChange={setShowLogs}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground p-0 h-auto">
              <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
              Histórico de sincronizações
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem registos</p>
            ) : (
              <div className="space-y-1">
                {logs.map(log => {
                  const logStatus = statusConfig[log.status];
                  return (
                    <div key={log.id} className="flex items-center gap-3 text-xs border rounded px-3 py-2">
                      {logStatus && (
                        <Badge variant="secondary" className={`text-xs gap-1 ${logStatus.color}`}>
                          {logStatus.icon} {logStatus.label}
                        </Badge>
                      )}
                      <span>{log.total_rows} linhas</span>
                      <span className="text-emerald-600">+{log.created_count}</span>
                      <span className="text-blue-600">↻{log.updated_count}</span>
                      {log.error_count > 0 && <span className="text-destructive">✗{log.error_count}</span>}
                      <span className="text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(log.started_at), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
