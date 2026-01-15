import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartCompanies, useAnalyzeCompany, useBulkAnalyzeCompanies, useCompaniesKPIs, SmartCompaniesFilters, SmartCompany } from "@/hooks/useSmartCompanies";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
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
import { Plus, Sparkles, Search, Building2, Flame, Clock, TrendingUp, Euro, Users, Briefcase, Snowflake, ThermometerSun, ExternalLink, RefreshCw, AlertTriangle, Globe, Factory } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const temperatureConfig = {
  cold: { emoji: "❄️", label: "Frio", color: "text-blue-500", bg: "bg-blue-500/10" },
  warm: { emoji: "🟡", label: "Morno", color: "text-amber-500", bg: "bg-amber-500/10" },
  hot: { emoji: "🔥", label: "Quente", color: "text-red-500", bg: "bg-red-500/10" },
};

const companyTypeLabels: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-blue-500/10 text-blue-600" },
  client: { label: "Cliente", color: "bg-emerald-500/10 text-emerald-600" },
  partner: { label: "Parceiro", color: "bg-purple-500/10 text-purple-600" },
  competitor: { label: "Concorrente", color: "bg-red-500/10 text-red-600" },
  vendor: { label: "Fornecedor", color: "bg-amber-500/10 text-amber-600" },
  unknown: { label: "Desconhecido", color: "bg-muted text-muted-foreground" },
};

function CompaniesKPIsBar() {
  const { data: kpis, isLoading } = useCompaniesKPIs();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)}</div>;
  if (!kpis) return null;

  const formatCurrency = (v: number) => v >= 1000000 ? `€${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `€${(v / 1000).toFixed(1)}K` : `€${v}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card className="p-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{kpis.totalCompanies}</p></div></Card>
      <Card className={cn("p-3 flex items-center gap-2", kpis.hotCompanies > 0 && "border-destructive/50 bg-destructive/5")}><Flame className="w-4 h-4 text-destructive" /><div><p className="text-xs text-muted-foreground">Quentes</p><p className="text-lg font-bold">{kpis.hotCompanies}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Clientes</p><p className="text-lg font-bold">{kpis.clients}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-600" /><div><p className="text-xs text-muted-foreground">Prospects</p><p className="text-lg font-bold">{kpis.prospects}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Score Médio</p><p className="text-lg font-bold">{kpis.avgScore}</p></div></Card>
      <Card className="p-3 flex items-center gap-2"><Euro className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">Pipeline</p><p className="text-lg font-bold">{formatCurrency(kpis.totalPipelineValue)}</p></div></Card>
    </div>
  );
}

export function SmartCompaniesTable() {
  const [filters, setFilters] = useState<SmartCompaniesFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: companies, isLoading, refetch } = useSmartCompanies(filters);
  const analyze = useAnalyzeCompany();
  const bulkAnalyze = useBulkAnalyzeCompanies();

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ companyId: id }); toast.success("Empresa analisada"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisadas`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const allSelected = companies && companies.length > 0 && selectedIds.size === companies.length;
  const toggleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(companies?.map(c => c.id) || []));
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Empresas Inteligentes</h1><p className="text-muted-foreground">Gestão inteligente de empresas com IA</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova</Button></div>
      </div>

      <CompaniesKPIsBar />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Pesquisar..." value={filters.search || ""} onChange={e => setFilters({ ...filters, search: e.target.value })} className="pl-9" /></div>
        <Select value={filters.temperature || "all"} onValueChange={v => setFilters({ ...filters, temperature: v as any })}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Temperatura" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="hot">🔥 Quente</SelectItem><SelectItem value="warm">🟡 Morno</SelectItem><SelectItem value="cold">❄️ Frio</SelectItem></SelectContent></Select>
        <Select value={filters.companyType || "all"} onValueChange={v => setFilters({ ...filters, companyType: v as any })}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="prospect">Prospect</SelectItem><SelectItem value="client">Cliente</SelectItem><SelectItem value="partner">Parceiro</SelectItem></SelectContent></Select>
        <div className="flex gap-2">
          {["hot", "high_intent"].map(f => (
            <Button key={f} variant={filters.smartFilter === f ? "secondary" : "ghost"} size="sm" onClick={() => setFilters({ ...filters, smartFilter: filters.smartFilter === f ? undefined : f as any })} className="h-8 text-xs">
              {f === "hot" && <><Flame className="w-3 h-3 mr-1" />Quentes</>}
              {f === "high_intent" && <><TrendingUp className="w-3 h-3 mr-1" />Alta Intenção</>}
            </Button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selecionada(s)</span>
          <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}><Sparkles className="w-4 h-4 mr-2" />Analisar com IA</Button>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Indústria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Temperatura</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Potencial €</TableHead>
              <TableHead>Próxima Ação</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />A carregar...</div></TableCell></TableRow>
            ) : !companies?.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12"><div className="flex flex-col items-center gap-3 text-muted-foreground"><Building2 className="w-12 h-12 opacity-50" /><p>Quando entrarem empresas, a IA vai organizá-las.</p><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar</Button></div></TableCell></TableRow>
            ) : companies.map(c => {
              const temp = temperatureConfig[c.ai_temperature];
              const type = companyTypeLabels[c.ai_company_type || "unknown"];
              const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              const formatCurrency = (v: number) => v >= 1000 ? `€${(v / 1000).toFixed(1)}K` : `€${v}`;
              return (
                <TableRow key={c.id} className={cn("group", selectedIds.has(c.id) && "bg-muted/50")}>
                  <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
                      <div><Link to={`/dashboard/companies/${c.id}`} className="font-medium hover:text-primary hover:underline">{c.name}</Link>{c.website && <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{c.website.replace(/^https?:\/\//, '')}</p>}</div>
                    </div>
                  </TableCell>
                  <TableCell>{c.industry ? <div className="flex items-center gap-1 text-sm"><Factory className="w-3 h-3 text-muted-foreground" />{c.industry}</div> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-xs", type.color)}>{type.label}</Badge></TableCell>
                  <TableCell><TooltipProvider><Tooltip><TooltipTrigger><div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", temp.bg, temp.color)}><span>{temp.emoji}</span>{temp.label}</div></TooltipTrigger><TooltipContent>Classificação automática</TooltipContent></Tooltip></TooltipProvider></TableCell>
                  <TableCell><div className="flex items-center gap-2"><div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", c.company_score >= 70 ? "bg-emerald-500" : c.company_score >= 40 ? "bg-amber-500" : "bg-muted-foreground")} style={{ width: `${c.company_score}%` }} /></div><span className="text-sm tabular-nums">{c.company_score}</span></div></TableCell>
                  <TableCell><span className="text-sm font-medium text-emerald-600">{c.estimated_value > 0 ? formatCurrency(c.estimated_value) : "—"}</span></TableCell>
                  <TableCell>{c.ai_next_action ? <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{c.ai_next_action}</span> : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAnalyze(c.id)} disabled={analyzingId === c.id}><Sparkles className={cn("w-4 h-4", analyzingId === c.id && "animate-pulse")} /></Button>
                      <Link to={`/dashboard/companies/${c.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-4 h-4" /></Button></Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateCompanyDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}