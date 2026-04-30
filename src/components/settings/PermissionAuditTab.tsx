import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ArrowRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

interface AuditEntry {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  table_name: "profile_field_permissions" | "profile_menu_permissions";
  action: "INSERT" | "UPDATE" | "DELETE";
  sales_function: string | null;
  page_key: string | null;
  field_key: string | null;
  menu_key: string | null;
  old_visible: boolean | null;
  new_visible: boolean | null;
  changed_at: string;
}

interface ActorProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface Props {
  workspaceId?: string;
}

const ACTION_META: Record<AuditEntry["action"], { label: string; icon: any; cls: string }> = {
  INSERT: { label: "Criado", icon: Plus, cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  UPDATE: { label: "Alterado", icon: ArrowRight, cls: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  DELETE: { label: "Removido", icon: Trash2, cls: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
};

export function PermissionAuditTab({ workspaceId }: Props) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["profile-permission-audit", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("profile_permission_audit_log")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("changed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!workspaceId,
  });

  const actorIds = useMemo(
    () => Array.from(new Set((entries ?? []).map((e) => e.actor_user_id).filter(Boolean) as string[])),
    [entries]
  );

  const { data: actors } = useQuery({
    queryKey: ["audit-actors", actorIds.join(",")],
    queryFn: async () => {
      if (actorIds.length === 0) return {} as Record<string, ActorProfile>;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", actorIds);
      if (error) return {} as Record<string, ActorProfile>;
      const map: Record<string, ActorProfile> = {};
      for (const p of (data ?? []) as ActorProfile[]) map[p.id] = p;
      return map;
    },
    enabled: actorIds.length > 0,
  });

  const actorLabel = (id: string | null) => {
    if (!id) return "Sistema";
    const p = actors?.[id];
    return p?.full_name || p?.email || `${id.slice(0, 8)}…`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Alterações
        </CardTitle>
        <CardDescription>
          Quem alterou permissões de menus e campos, o que mudou e quando. Mostra as últimas 200 entradas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(!entries || entries.length === 0) ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Ainda não existem alterações registadas neste workspace.
          </div>
        ) : (
          <ScrollArea className="h-[480px] pr-3">
            <div className="space-y-2">
              {entries.map((e) => {
                const meta = ACTION_META[e.action];
                const Icon = meta.icon;
                const target = e.table_name === "profile_field_permissions" ? "campo" : "menu";
                const key = e.field_key ?? e.menu_key ?? "—";
                const path = e.page_key ? `${e.page_key} › ${key}` : key;
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 rounded-md border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                  >
                    <Badge variant="outline" className={`${meta.cls} gap-1 shrink-0`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{actorLabel(e.actor_user_id)}</span>{" "}
                        <span className="text-muted-foreground">
                          {meta.label.toLowerCase()} {target} para o perfil
                        </span>{" "}
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {e.sales_function ?? "—"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <code className="bg-muted px-1.5 py-0.5 rounded">{path}</code>
                        {e.action === "UPDATE" && (
                          <>
                            <VisibilityChip value={e.old_visible} />
                            <ArrowRight className="h-3 w-3" />
                            <VisibilityChip value={e.new_visible} />
                          </>
                        )}
                        {e.action === "INSERT" && <VisibilityChip value={e.new_visible} />}
                        {e.action === "DELETE" && <VisibilityChip value={e.old_visible} />}
                      </div>
                    </div>
                    <div
                      className="text-xs text-muted-foreground shrink-0 text-right"
                      title={format(new Date(e.changed_at), "dd/MM/yyyy HH:mm:ss")}
                    >
                      {formatDistanceToNow(new Date(e.changed_at), { addSuffix: true, locale: pt })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function VisibilityChip({ value }: { value: boolean | null }) {
  if (value === null) return <span className="italic">—</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-600">
      <Eye className="h-3 w-3" /> visível
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-rose-600">
      <EyeOff className="h-3 w-3" /> oculto
    </span>
  );
}
