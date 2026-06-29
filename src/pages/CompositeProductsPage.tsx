import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Sparkles, AlertTriangle, Package, ShieldCheck,
  Search, Eye, CheckCircle2, XCircle, Loader2, MoreHorizontal,
} from "lucide-react";
import { useCompositeProducts, useAISuggestions, useReviewAISuggestion, type CompositeProduct, type MarginGuardLevel } from "@/hooks/useCompositeProducts";
import { CompositeProductWizard } from "@/components/composite-products/CompositeProductWizard";
import { IXCard } from "@/components/entity/ix/IXCard";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { formatMoneyEur } from "@/lib/money";

const guardConfig: Record<MarginGuardLevel, { label: string; className: string }> = {
  safe: { label: "Seguro", className: "border-border text-foreground" },
  attention: { label: "Atenção", className: "border-border text-muted-foreground" },
  danger: { label: "Perigoso", className: "border-destructive/30 text-destructive" },
  not_recommended: { label: "Não recomendado", className: "border-destructive/40 text-destructive" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "border-border text-muted-foreground" },
  pending_approval: { label: "Aguarda aprovação", className: "border-border text-foreground" },
  active: { label: "Ativo", className: "border-primary/30 text-primary" },
  paused: { label: "Pausado", className: "border-border text-muted-foreground" },
  archived: { label: "Arquivado", className: "border-border text-muted-foreground" },
};

function KpiTile({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function CompositeProductsPage() {
  const navigate = useNavigate();
  const { data: kits = [], isLoading } = useCompositeProducts();
  const { data: aiSuggestions = [] } = useAISuggestions({ status: "pending_validation" });
  const review = useReviewAISuggestion();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const kpis = useMemo(() => {
    const active = kits.filter((k) => k.status === "active").length;
    const pending = kits.filter((k) => k.status === "pending_approval").length;
    const danger = kits.filter((k) => k.margin_guard_level === "danger" || k.margin_guard_level === "not_recommended").length;
    const aiCount = aiSuggestions.length;
    return { active, pending, danger, aiCount };
  }, [kits, aiSuggestions]);

  const counts = useMemo(() => ({
    all: kits.length,
    active: kits.filter((k) => k.status === "active").length,
    pending: kits.filter((k) => k.status === "pending_approval").length,
    risk: kits.filter((k) => k.margin_guard_level === "danger" || k.margin_guard_level === "not_recommended").length,
    ai: kits.filter((k) => k.composition_type === "ai_suggested_pack").length,
  }), [kits]);

  const filtered = useMemo(() => {
    let list = kits;
    if (tab === "active") list = list.filter((k) => k.status === "active");
    else if (tab === "pending") list = list.filter((k) => k.status === "pending_approval");
    else if (tab === "ai") list = list.filter((k) => k.composition_type === "ai_suggested_pack");
    else if (tab === "risk") list = list.filter((k) => k.margin_guard_level === "danger" || k.margin_guard_level === "not_recommended");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((k) => k.name.toLowerCase().includes(q) || (k.sku ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [kits, tab, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Produtos Compostos Inteligentes</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Kits, packs, bundles e soluções configuráveis com cálculo automático de margem, stock virtual e sugestões IA.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setWizardOpen(true)} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Novo produto composto
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTab("ai")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sugestões IA {kpis.aiCount > 0 && `(${kpis.aiCount})`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile icon={Package} label="Kits ativos" value={kpis.active} />
          <KpiTile icon={ShieldCheck} label="Aguarda aprovação" value={kpis.pending} hint="Precisam validação" />
          <KpiTile icon={AlertTriangle} label="Risco de margem" value={kpis.danger} hint="Margem abaixo do mínimo" />
          <KpiTile icon={Sparkles} label="Sugeridos pela IA" value={kpis.aiCount} hint="A aguardar revisão" />
        </div>

        {/* AI suggestions */}
        {aiSuggestions.length > 0 && (
          <IXCard
            title={`Sugestões da IA a aguardar validação (${aiSuggestions.length})`}
            description="Reveja e aprove propostas geradas automaticamente."
          >
            <div className="space-y-2 max-h-64 overflow-auto">
              {aiSuggestions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-normal">{s.suggestion_type.replace(/_/g, " ")}</Badge>
                      <p className="font-medium text-sm truncate">{s.title}</p>
                    </div>
                    {s.rationale && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.rationale}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {s.estimated_margin_pct != null && <span>Margem: {Number(s.estimated_margin_pct).toFixed(1)}%</span>}
                      {s.estimated_revenue != null && <span>Receita: {formatMoneyEur(Number(s.estimated_revenue))}</span>}
                      {s.confidence != null && <span>Confiança: {Math.round(Number(s.confidence) * 100)}%</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: s.id, status: "approved" })} disabled={review.isPending}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: s.id, status: "rejected" })} disabled={review.isPending}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </IXCard>
        )}

        {/* List */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <IXEntityTabs
            tabs={[
              { id: "all", label: "Todos", count: counts.all },
              { id: "active", label: "Ativos", count: counts.active },
              { id: "pending", label: "Aguarda aprovação", count: counts.pending },
              { id: "risk", label: "Risco de margem", count: counts.risk },
              { id: "ai", label: "Gerados por IA", count: counts.ai },
            ]}
            activeId={tab}
            onChange={setTab}
            className="px-4 sm:px-6"
          />
          <div className="px-4 sm:px-6 pt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Procurar nome ou SKU..."
                className="pl-10 h-12 rounded-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> A carregar...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  {search ? "Nenhum kit encontrado" : "Ainda não tem produtos compostos. Crie o primeiro."}
                </p>
                {!search && (
                  <Button onClick={() => setWizardOpen(true)} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" /> Criar primeiro kit
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Margin Guard</TableHead>
                    <TableHead className="hidden md:table-cell">Preço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((k) => (
                    <KitRow key={k.id} kit={k} />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      <CompositeProductWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={(id) => navigate(`/dashboard/composite-products/${id}`)} />
    </DashboardLayout>
  );
}

function KitRow({ kit }: { kit: CompositeProduct }) {
  const guard = guardConfig[kit.margin_guard_level ?? "safe"] ?? guardConfig.safe;
  const status = statusConfig[kit.status] ?? statusConfig.draft;
  const compType = (kit.composition_type ?? "fixed_kit").replace(/_/g, " ");
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          {kit.image_url ? (
            <img src={kit.image_url} alt={kit.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{kit.name}</p>
            {kit.sku && <p className="text-xs text-muted-foreground">{kit.sku}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline" className="font-normal">{compType}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={status.className}>{status.label}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={guard.className}>{guard.label}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {kit.fixed_price != null ? formatMoneyEur(Number(kit.fixed_price)) : <span className="text-muted-foreground text-sm">auto</span>}
      </TableCell>
      <TableCell className="text-right">
        <Button asChild size="sm" variant="ghost">
          <Link to={`/dashboard/composite-products/${kit.id}`}>
            <Eye className="h-4 w-4 mr-1" /> Abrir
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
