import { useState } from "react";
import { useLedgerChains, useLedgerChainDetail, useLedgerSettings, useRefreshLedger, useLedgerStats, useLedgerSearch } from "@/hooks/useLedger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BookOpen, RefreshCw, Link2, CheckCircle2, XCircle, Activity, Search, DollarSign, Settings2, ArrowRight, Clock, Zap } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

const CHAIN_TYPES = [
  { value: "all", label: "Todos" },
  { value: "lead_journey", label: "Lead Journey" },
  { value: "recovery_journey", label: "Recovery Journey" },
  { value: "opportunity_journey", label: "Opportunity Journey" },
  { value: "objective_execution", label: "Objective Execution" },
  { value: "mission_execution", label: "Mission Execution" },
  { value: "action_chain", label: "Action Chain" },
  { value: "agent_handoff_chain", label: "Agent Handoff" },
  { value: "strategy_to_execution", label: "Strategy → Execution" },
  { value: "forecast_to_action", label: "Forecast → Action" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  completed: "bg-green-500/15 text-green-600 border-green-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  stalled: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
};

const RELATION_COLORS: Record<string, string> = {
  caused: "bg-chart-1/15 text-chart-1",
  triggered: "bg-chart-2/15 text-chart-2",
  executed: "bg-chart-3/15 text-chart-3",
  resolved: "bg-green-500/15 text-green-600",
  converted: "bg-chart-4/15 text-chart-4",
  escalated: "bg-destructive/15 text-destructive",
  completed: "bg-green-500/15 text-green-600",
  updated: "bg-muted text-muted-foreground",
};

export default function LedgerCenterPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<string>();
  const [showSettings, setShowSettings] = useState(false);

  const { data: chains, isLoading } = useLedgerChains(
    typeFilter !== "all" ? typeFilter : undefined,
    statusFilter !== "all" ? statusFilter : undefined
  );
  const { data: stats } = useLedgerStats();
  const { data: searchResults } = useLedgerSearch(searchQuery);
  const { data: chainDetail, isLoading: detailLoading } = useLedgerChainDetail(selectedChainId);
  const { data: settings, upsert: upsertSettings } = useLedgerSettings();
  const refreshLedger = useRefreshLedger();

  const displayChains = searchQuery.length >= 2 ? searchResults : chains;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Operating Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rastreabilidade causal de eventos, decisões e resultados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Definições
          </Button>
          <Button size="sm" onClick={() => refreshLedger.mutate()} disabled={refreshLedger.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshLedger.isPending ? "animate-spin" : ""}`} />
            Reconstruir Chains
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Chains</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats?.completed ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats?.failed ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats?.active ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-chart-4" />
              <span className="text-xs text-muted-foreground">Receita Atribuída</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {(stats?.totalRevenue ?? 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por correlation_id, entidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {CHAIN_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="stalled">Stalled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chains List */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Causal Chains</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !displayChains?.length ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhuma chain encontrada. Clique em "Reconstruir Chains" para processar eventos.
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {displayChains.map((chain: any) => (
                  <button
                    key={chain.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setSelectedChainId(chain.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                          {chain.chain_type}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 h-4 border ${STATUS_COLORS[chain.status] ?? "bg-muted text-muted-foreground"}`}>
                          {chain.status}
                        </Badge>
                        {chain.outcome_value && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                            {Number(chain.outcome_value).toLocaleString("pt-PT", { style: "currency", currency: chain.outcome_currency || "EUR" })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{chain.title ?? chain.correlation_id}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {chain.event_count} eventos · {chain.started_at ? formatDistanceToNow(new Date(chain.started_at), { addSuffix: true, locale: pt }) : "—"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chain Detail Sheet */}
      <Sheet open={!!selectedChainId} onOpenChange={(open) => !open && setSelectedChainId(undefined)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Chain Detail
            </SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : chainDetail ? (
            <div className="space-y-4 mt-4">
              {/* Chain Summary */}
              <Card className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{chainDetail.chain.chain_type}</Badge>
                    <Badge className={`text-[10px] border ${STATUS_COLORS[chainDetail.chain.status] ?? ""}`}>
                      {chainDetail.chain.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium">{chainDetail.chain.title}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">corr: {chainDetail.chain.correlation_id}</p>
                  {chainDetail.chain.outcome_summary && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2 mt-2">
                      <p className="text-xs font-medium text-green-600">Outcome: {chainDetail.chain.outcome_summary}</p>
                      {chainDetail.chain.outcome_value && (
                        <p className="text-xs text-green-600/80">
                          Valor: {Number(chainDetail.chain.outcome_value).toLocaleString("pt-PT", { style: "currency", currency: chainDetail.chain.outcome_currency || "EUR" })}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Timeline</p>
                <div className="relative space-y-0">
                  {chainDetail.links.map((link: any, idx: number) => {
                    const evt = chainDetail.events[link.event_id];
                    if (!evt) return null;

                    return (
                      <div key={link.id} className="relative flex gap-3">
                        {/* Connector line */}
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {idx < chainDetail.links.length - 1 && (
                            <div className="w-px flex-1 bg-border min-h-[24px]" />
                          )}
                        </div>

                        <div className="flex-1 pb-3 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`text-[9px] px-1 h-3.5 ${RELATION_COLORS[link.relation_type] ?? "bg-muted text-muted-foreground"}`}>
                              {link.relation_type}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">d={link.depth}</span>
                          </div>
                          <p className="text-xs font-medium text-foreground mt-0.5 truncate">{evt.type}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {evt.entity_kind}:{evt.entity_id?.slice(0, 8)} · {evt.actor_type}
                            {evt.source_module ? ` · ${evt.source_module}` : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(evt.occurred_at), "dd/MM HH:mm:ss", { locale: pt })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Definições do Ledger
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ledger Ativo</Label>
              <Switch
                checked={settings?.is_enabled ?? false}
                onCheckedChange={(v) => upsertSettings.mutate({ is_enabled: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto Chain Build</Label>
              <Switch
                checked={settings?.auto_chain_build ?? true}
                onCheckedChange={(v) => upsertSettings.mutate({ auto_chain_build: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Reter Payloads</Label>
              <Switch
                checked={settings?.retain_raw_payloads ?? true}
                onCheckedChange={(v) => upsertSettings.mutate({ retain_raw_payloads: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Max Chain Depth</Label>
              <Input
                type="number"
                min={5}
                max={100}
                value={settings?.max_chain_depth ?? 20}
                onChange={(e) => upsertSettings.mutate({ max_chain_depth: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
