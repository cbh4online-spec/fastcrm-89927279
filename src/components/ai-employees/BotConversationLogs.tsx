import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from "@/hooks/useBots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

interface BotConversationLogsProps {
  bot: Bot;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "Sucesso", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: CheckCircle2 },
  success: { label: "Sucesso", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: CheckCircle2 },
  error: { label: "Erro", color: "text-destructive border-destructive/30 bg-destructive/10", icon: XCircle },
  handover: { label: "Handover", color: "text-amber-400 border-amber-500/30 bg-amber-500/10", icon: ArrowRightLeft },
};

export function BotConversationLogs({ bot }: BotConversationLogsProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bot-runs", bot.id, statusFilter, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from("bot_runs")
        .select("*", { count: "exact" })
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: runs, error, count } = await query;
      if (error) throw error;
      return { runs: runs || [], total: count || 0 };
    },
  });

  const runs = data?.runs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredRuns = search
    ? runs.filter((r: any) =>
        JSON.stringify(r.input_payload || "").toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(r.output_payload || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.error_message || "").toLowerCase().includes(search.toLowerCase())
      )
    : runs;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nos logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ok">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="handover">Handover</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground">
        {total} execução(ões) encontrada(s)
      </div>

      {/* Logs list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Nenhuma execução encontrada</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredRuns.map((run: any) => {
            const config = STATUS_MAP[run.status] || STATUS_MAP.ok;
            const Icon = config.icon;
            const isOpen = expandedIds.has(run.id);

            return (
              <Collapsible key={run.id} open={isOpen} onOpenChange={() => toggleExpand(run.id)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <Icon className={`h-4 w-4 shrink-0 ${config.color.split(" ")[0]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {run.conversation_id ? `Conversa #${run.conversation_id.slice(0, 8)}` : `Run #${run.id.slice(0, 8)}`}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: pt })}
                        {" · "}
                        {format(new Date(run.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-8 mt-1 mb-2 space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4 text-xs">
                    {run.error_message && (
                      <div>
                        <p className="font-semibold text-destructive mb-1">Erro</p>
                        <pre className="whitespace-pre-wrap text-destructive/80 bg-destructive/5 rounded p-2">{run.error_message}</pre>
                      </div>
                    )}
                    {run.input_payload && (
                      <div>
                        <p className="font-semibold text-muted-foreground mb-1">Input</p>
                        <pre className="whitespace-pre-wrap bg-background rounded p-2 max-h-48 overflow-auto border border-border/40">
                          {JSON.stringify(run.input_payload, null, 2)}
                        </pre>
                      </div>
                    )}
                    {run.output_payload && (
                      <div>
                        <p className="font-semibold text-muted-foreground mb-1">Output</p>
                        <pre className="whitespace-pre-wrap bg-background rounded p-2 max-h-48 overflow-auto border border-border/40">
                          {JSON.stringify(run.output_payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Seguinte
          </Button>
        </div>
      )}
    </div>
  );
}
