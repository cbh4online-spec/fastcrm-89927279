import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllWorkspaces } from "@/hooks/useAllWorkspaces";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface AuditRow {
  id: string;
  source: string;
  source_workspace_id: string | null;
  resolved_workspace_id: string | null;
  ghl_location_id: string | null;
  ghl_conversation_id: string | null;
  ghl_account_id: string | null;
  channel_type: string | null;
  action: string;
  reason: string | null;
  payload: any;
  created_at: string;
}

const ACTION_OPTIONS = [
  { value: "all", label: "Todas as ações" },
  { value: "imported", label: "Importadas" },
  { value: "skipped", label: "Skipped" },
  { value: "moved", label: "Movidas" },
  { value: "kept", label: "Mantidas" },
  { value: "error", label: "Erros" },
];

const REASON_OPTIONS = [
  { value: "all", label: "Todas as razões" },
  { value: "skipped_wrong_workspace", label: "Skipped — wrong workspace" },
  { value: "account_id_owned_by_other_workspace", label: "Account_id de outro workspace" },
  { value: "no_account_id_with_siblings_fail_closed", label: "Sem account_id (fail-closed)" },
  { value: "no_owner", label: "Sem owner" },
  { value: "ok", label: "OK" },
];

const CHANNEL_OPTIONS = [
  { value: "all", label: "Todos os canais" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

const PAGE_SIZE = 100;

export function GHLRoutingAuditPanel() {
  const { workspaces } = useAllWorkspaces();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [reason, setReason] = useState<string>("all");
  const [search, setSearch] = useState("");

  const wsName = useMemo(() => {
    const map = new Map(workspaces.map((w) => [w.id, w.name]));
    return (id: string | null) => (id ? map.get(id) || id.slice(0, 8) : "—");
  }, [workspaces]);

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ghl_routing_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (workspaceId !== "all") {
        query = query.or(
          `source_workspace_id.eq.${workspaceId},resolved_workspace_id.eq.${workspaceId}`
        );
      }
      if (channel !== "all") query = query.eq("channel_type", channel);
      if (action !== "all") query = query.eq("action", action);
      if (reason !== "all") query = query.eq("reason", reason);

      const { data, error } = await query;
      if (error) throw error;
      setRows((data || []) as AuditRow[]);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao carregar auditoria de routing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, channel, action, reason]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.ghl_conversation_id?.toLowerCase().includes(q) ||
        r.ghl_account_id?.toLowerCase().includes(q) ||
        r.ghl_location_id?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const acc = { imported: 0, skipped: 0, moved: 0, kept: 0, error: 0, other: 0 };
    for (const r of rows) {
      if (r.action in acc) (acc as any)[r.action]++;
      else acc.other++;
    }
    return acc;
  }, [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Auditoria de routing GHL
              </CardTitle>
              <CardDescription>
                Últimos {PAGE_SIZE} eventos de decisão de routing entre workspaces que partilham
                <code className="mx-1">location_id</code>.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Stat label="Imported" value={stats.imported} tone="ok" />
            <Stat label="Kept" value={stats.kept} tone="ok" />
            <Stat label="Moved" value={stats.moved} tone="info" />
            <Stat label="Skipped" value={stats.skipped} tone="warn" />
            <Stat label="Errors" value={stats.error} tone="danger" />
            <Stat label="Outros" value={stats.other} tone="muted" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Workspace</Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os workspaces</SelectItem>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ação</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Razão</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pesquisa (conv/account/location)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID parcial…" />
            </div>
          </div>

          <ScrollArea className="h-[520px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[140px]">Quando</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Workspace origem → resolvido</TableHead>
                  <TableHead>Account / Conv ID</TableHead>
                  <TableHead>Razão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sem eventos para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: pt })}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{r.source}</Badge>
                    </TableCell>
                    <TableCell><ActionBadge action={r.action} /></TableCell>
                    <TableCell className="text-xs">{r.channel_type || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span>{wsName(r.source_workspace_id)}</span>
                        {r.resolved_workspace_id && r.resolved_workspace_id !== r.source_workspace_id && (
                          <span className="text-muted-foreground">→ {wsName(r.resolved_workspace_id)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <div className="flex flex-col">
                        <span title={r.ghl_account_id || ""}>
                          acc: {r.ghl_account_id ? r.ghl_account_id.slice(0, 14) + "…" : "—"}
                        </span>
                        <span className="text-muted-foreground" title={r.ghl_conversation_id || ""}>
                          conv: {r.ghl_conversation_id ? r.ghl_conversation_id.slice(0, 14) + "…" : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.reason ? <ReasonBadge reason={r.reason} /> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" | "info" | "muted" }) {
  const colour =
    tone === "ok" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "danger" ? "text-destructive" :
    tone === "info" ? "text-primary" :
    "text-muted-foreground";
  return (
    <div className="rounded-md border p-3 text-center">
      <div className={`text-2xl font-bold ${colour}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { label: string; cls: string; icon?: any }> = {
    imported: { label: "imported", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
    kept: { label: "kept", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    moved: { label: "moved", cls: "bg-primary/10 text-primary border-primary/30" },
    skipped: { label: "skipped", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: AlertTriangle },
    error: { label: "error", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  const cfg = map[action] || { label: action, cls: "" };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cfg.cls}>
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {cfg.label}
    </Badge>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  const danger = reason.includes("fail_closed") || reason.includes("owned_by_other") || reason.includes("wrong_workspace");
  return (
    <Badge variant={danger ? "destructive" : "secondary"} className="font-normal">
      {reason}
    </Badge>
  );
}
