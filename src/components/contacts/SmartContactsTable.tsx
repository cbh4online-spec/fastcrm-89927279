import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, useContactsKPIs, SmartContactsFilters, SmartContact } from "@/hooks/useSmartContacts";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Sparkles, Search, Users, Flame, Clock, TrendingUp, Euro, UserCheck, Snowflake, ThermometerSun, ExternalLink, MoreHorizontal, RefreshCw, Building2, Briefcase, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const temperatureConfig = {
  cold: { emoji: "❄️", label: "Frio", color: "text-blue-500", bg: "bg-blue-500/10" },
  warm: { emoji: "🟡", label: "Morno", color: "text-amber-500", bg: "bg-amber-500/10" },
  hot: { emoji: "🔥", label: "Quente", color: "text-red-500", bg: "bg-red-500/10" },
};

const contactTypeLabels: Record<string, string> = {
  decision_maker: "Decisor",
  influencer: "Influenciador",
  champion: "Champion",
  blocker: "Blocker",
  end_user: "Utilizador",
  unknown: "Desconhecido",
};

function ContactsKPIsBar() {
  const { data: kpis, isLoading } = useContactsKPIs();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>;
  if (!kpis) return null;

  const formatCurrency = (v: number) => v >= 1000 ? `€${(v / 1000).toFixed(1)}K` : `€${v}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card className="p-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{kpis.totalContacts}</p></div></Card>
      <Card className={cn("p-3 flex items-center gap-2", kpis.hotContacts > 0 && "border-destructive/50 bg-destructive/5")}><Flame className="w-4 h-4 text-destructive" /><div><p className="text-xs text-muted-foreground">Quentes</p><p className="text-lg font-bold">{kpis.hotContacts}</p></div></Card>
      <Card className={cn("p-3 flex items-center gap-2", kpis.noResponseOver24h > 0 && "border-destructive/50 bg-destructive/5")}><Clock className="w-4 h-4 text-destructive" /><div><p className="text-xs text-muted-foreground">Sem Resposta</p><p className="text-lg font-bold">{kpis.noResponseOver24h}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Score Médio</p><p className="text-lg font-bold">{kpis.avgScore}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Decisores</p><p className="text-lg font-bold">{kpis.decisionMakers}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><Euro className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Pipeline</p><p className="text-lg font-bold">{formatCurrency(kpis.totalPipelineValue)}</p></div></Card>
    </div>
  );
}

export function SmartContactsTable() {
  const [filters, setFilters] = useState<SmartContactsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ contactId: id }); toast.success("Contacto analisado"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisados`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const allSelected = contacts && contacts.length > 0 && selectedIds.size === contacts.length;
  const toggleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(contacts?.map(c => c.id) || []));
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Contactos Inteligentes</h1><p className="text-muted-foreground">Gestão inteligente de contactos com IA</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo</Button></div>
      </div>

      <ContactsKPIsBar />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Pesquisar..." value={filters.search || ""} onChange={e => setFilters({ ...filters, search: e.target.value })} className="pl-9" /></div>
        <Select value={filters.temperature || "all"} onValueChange={v => setFilters({ ...filters, temperature: v as any })}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Temperatura" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="hot">🔥 Quente</SelectItem><SelectItem value="warm">🟡 Morno</SelectItem><SelectItem value="cold">❄️ Frio</SelectItem></SelectContent></Select>
        <div className="flex gap-2">
          {["hot", "no_response", "high_intent"].map(f => (
            <Button key={f} variant={filters.smartFilter === f ? "secondary" : "ghost"} size="sm" onClick={() => setFilters({ ...filters, smartFilter: filters.smartFilter === f ? undefined : f as any })} className="h-8 text-xs">
              {f === "hot" && <><Flame className="w-3 h-3 mr-1" />Quentes</>}
              {f === "no_response" && <><Clock className="w-3 h-3 mr-1" />Sem Resposta</>}
              {f === "high_intent" && <><TrendingUp className="w-3 h-3 mr-1" />Alta Intenção</>}
            </Button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
          <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}><Sparkles className="w-4 h-4 mr-2" />Analisar com IA</Button>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Temperatura</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Próxima Ação</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />A carregar...</div></TableCell></TableRow>
            ) : !contacts?.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12"><div className="flex flex-col items-center gap-3 text-muted-foreground"><Users className="w-12 h-12 opacity-50" /><p>Quando entrarem contactos, a IA vai organizá-los.</p><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar</Button></div></TableCell></TableRow>
            ) : contacts.map(c => {
              const temp = temperatureConfig[c.ai_temperature];
              const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <TableRow key={c.id} className={cn("group", selectedIds.has(c.id) && "bg-muted/50", c.slaBreach && "bg-destructive/5")}>
                  <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
                      <div><Link to={`/dashboard/contacts/${c.id}`} className="font-medium hover:text-primary hover:underline">{c.name}</Link>{c.job_title && <p className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.job_title}</p>}</div>
                    </div>
                  </TableCell>
                  <TableCell>{c.company ? <div className="flex items-center gap-1 text-sm"><Building2 className="w-3 h-3 text-muted-foreground" />{c.company}</div> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><TooltipProvider><Tooltip><TooltipTrigger><div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", temp.bg, temp.color)}><span>{temp.emoji}</span>{temp.label}</div></TooltipTrigger><TooltipContent>Classificação automática</TooltipContent></Tooltip></TooltipProvider></TableCell>
                  <TableCell><div className="flex items-center gap-2"><div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", c.contact_score >= 70 ? "bg-emerald-500" : c.contact_score >= 40 ? "bg-amber-500" : "bg-muted-foreground")} style={{ width: `${c.contact_score}%` }} /></div><span className="text-sm tabular-nums">{c.contact_score}</span></div></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{contactTypeLabels[c.ai_contact_type || "unknown"]}</Badge></TableCell>
                  <TableCell>{c.ai_next_action ? <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{c.ai_next_action}</span> : "—"}</TableCell>
                  <TableCell><div className={cn("flex items-center gap-1 text-xs", c.slaBreach && "text-destructive font-medium")}>{c.slaBreach && <AlertTriangle className="w-3 h-3" />}<Clock className="w-3 h-3" />{c.hoursSinceLastContact !== null ? (c.hoursSinceLastContact < 24 ? `${Math.round(c.hoursSinceLastContact)}h` : `${Math.round(c.hoursSinceLastContact / 24)}d`) : "—"}</div></TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAnalyze(c.id)} disabled={analyzingId === c.id}><Sparkles className={cn("w-4 h-4", analyzingId === c.id && "animate-pulse")} /></Button>
                      <Link to={`/dashboard/contacts/${c.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-4 h-4" /></Button></Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateContactDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}