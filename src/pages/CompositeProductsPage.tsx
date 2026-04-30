import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Sparkles, AlertTriangle, Package, TrendingUp, ShieldCheck,
  Search, Eye, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { useCompositeProducts, useAISuggestions, useReviewAISuggestion, type CompositeProduct, type MarginGuardLevel } from "@/hooks/useCompositeProducts";
import { CompositeProductWizard } from "@/components/composite-products/CompositeProductWizard";
import { formatMoneyEur } from "@/lib/money";

const guardConfig: Record<MarginGuardLevel, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  safe: { label: "Seguro", variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  attention: { label: "Atenção", variant: "secondary", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  danger: { label: "Perigoso", variant: "destructive", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  not_recommended: { label: "Não recomendado", variant: "destructive", className: "bg-red-600/20 text-red-800 dark:text-red-300 border-red-600/40" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Aguarda aprovação", className: "bg-amber-500/15 text-amber-700" },
  active: { label: "Ativo", className: "bg-emerald-500/15 text-emerald-700" },
  paused: { label: "Pausado", className: "bg-orange-500/15 text-orange-700" },
  archived: { label: "Arquivado", className: "bg-muted text-muted-foreground" },
};

function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: { icon: any; label: string; value: string | number; hint?: string; tone?: "default" | "success" | "warning" | "danger" | "ai" }) {
  const tones = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    ai: "text-violet-600 dark:text-violet-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold ${tones[tone]}`}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <Icon className={`h-5 w-5 ${tones[tone]}`} />
        </div>
      </CardContent>
    </Card>
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Produtos Compostos Inteligentes</h1>
            <p className="text-sm text-muted-foreground">Kits, packs, bundles e soluções configuráveis com cálculo automático de margem, stock virtual e sugestões IA.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/composite-products?tab=ai")}>
              <Sparkles className="h-4 w-4 mr-2" />
              Sugestões IA
              {kpis.aiCount > 0 && <Badge variant="secondary" className="ml-2">{kpis.aiCount}</Badge>}
            </Button>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo produto composto
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Package} label="Kits ativos" value={kpis.active} tone="success" />
          <KpiCard icon={ShieldCheck} label="Aguarda aprovação" value={kpis.pending} tone="warning" hint="Precisam validação" />
          <KpiCard icon={AlertTriangle} label="Risco de margem" value={kpis.danger} tone="danger" hint="Margem abaixo do mínimo" />
          <KpiCard icon={Sparkles} label="Sugeridos pela IA" value={kpis.aiCount} tone="ai" hint="A aguardar revisão" />
        </div>

        {/* AI suggestions banner */}
        {aiSuggestions.length > 0 && (
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Sugestões da IA a aguardar validação ({aiSuggestions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-auto">
                {aiSuggestions.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-md bg-background border">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{s.suggestion_type.replace(/_/g, " ")}</Badge>
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
            </CardContent>
          </Card>
        )}

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="active">Ativos</TabsTrigger>
                  <TabsTrigger value="pending">Aguarda aprovação</TabsTrigger>
                  <TabsTrigger value="risk">Risco de margem</TabsTrigger>
                  <TabsTrigger value="ai">Gerados por IA</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Procurar nome ou SKU..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                  <Button onClick={() => setWizardOpen(true)}>
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
          </CardContent>
        </Card>
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
            <img src={kit.image_url} alt={kit.name} className="h-9 w-9 rounded object-cover" />
          ) : (
            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
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
        <Badge variant="outline" className="font-normal">{kit.composition_type.replace(/_/g, " ")}</Badge>
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
