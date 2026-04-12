import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Copy, TrendingUp, Package, Gift, Sparkles, Target, AlertTriangle, Plus, ClipboardList } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";

type AIAction = "market_research" | "suggest_features_by_tier" | "suggest_modules" | "suggest_bundles";

interface AIStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: AIAction | null;
  result: any;
  onApplyFeatures?: (planKey: string, features: string[]) => void;
}

const actionTitles: Record<AIAction, { title: string; description: string; icon: React.ReactNode }> = {
  market_research: { title: "Pesquisa de Mercado", description: "Análise competitiva do mercado CRM SaaS", icon: <TrendingUp className="h-5 w-5" /> },
  suggest_features_by_tier: { title: "Features por Nível", description: "Features diferenciadas para cada plano", icon: <Sparkles className="h-5 w-5" /> },
  suggest_modules: { title: "Módulos Sugeridos", description: "Novos módulos para o marketplace", icon: <Package className="h-5 w-5" /> },
  suggest_bundles: { title: "Bundles & Promoções", description: "Bundles temáticos e promoções", icon: <Gift className="h-5 w-5" /> },
};

export function AIStrategyDialog({ open, onOpenChange, action, result, onApplyFeatures }: AIStrategyDialogProps) {
  if (!action || !result) return null;

  const meta = actionTitles[action];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.icon}
            {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          {action === "market_research" && <MarketResearchView data={result} />}
          {action === "suggest_features_by_tier" && <FeaturesByTierView data={result} onApply={onApplyFeatures} />}
          {action === "suggest_modules" && <SuggestedModulesView data={result} />}
          {action === "suggest_bundles" && <BundlesView data={result} />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Market Research View ───
function MarketResearchView({ data }: { data: any }) {
  const competitors = data?.competitors || [];
  const gaps = data?.pricing_gaps || [];
  const mustHave = data?.must_have_features || [];
  const diffOps = data?.differentiation_opportunities || [];

  return (
    <div className="space-y-6">
      {data?.market_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Resumo do Mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.market_summary}</p>
          </CardContent>
        </Card>
      )}

      {competitors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Concorrentes Analisados ({competitors.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Concorrente</TableHead>
                  <TableHead className="text-xs">Planos</TableHead>
                  <TableHead className="text-xs">Posicionamento</TableHead>
                  <TableHead className="text-xs">Forças / Fraquezas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        {(c.plans || []).map((p: any, j: number) => (
                          <div key={j} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px]">{p.tier}</Badge>
                            <span>€{p.price_monthly}/mês</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">{c.positioning}</TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        {(c.strengths || []).slice(0, 2).map((s: string, j: number) => (
                          <div key={j} className="flex items-center gap-1 text-green-600">
                            <Check className="h-3 w-3" /> {s}
                          </div>
                        ))}
                        {(c.weaknesses || []).slice(0, 2).map((w: string, j: number) => (
                          <div key={j} className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" /> {w}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gaps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Gaps de Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {gaps.map((g: string, i: number) => (
                  <li key={i} className="text-xs flex items-start gap-1">
                    <TrendingUp className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {mustHave.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Features Essenciais</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {mustHave.map((f: string, i: number) => (
                  <li key={i} className="text-xs flex items-start gap-1">
                    <Check className="h-3 w-3 mt-0.5 text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {diffOps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Oportunidades</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {diffOps.map((d: string, i: number) => (
                  <li key={i} className="text-xs flex items-start gap-1">
                    <Sparkles className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Features by Tier View ───
function FeaturesByTierView({ data, onApply }: { data: any; onApply?: (planKey: string, features: string[]) => void }) {
  const tiers = data?.tiers || [];
  const planColors: Record<string, string> = {
    start: "hsl(142, 76%, 36%)",
    grow: "hsl(221, 83%, 53%)",
    pro: "hsl(262, 83%, 58%)",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier: any, i: number) => {
          const key = (tier.plan_key || "").toLowerCase();
          const color = planColors[key] || "hsl(var(--primary))";
          return (
            <Card key={i} className="relative">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: color }} />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{tier.plan_name || tier.plan_key}</CardTitle>
                  {onApply && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        onApply(tier.plan_key, tier.features);
                        toast.success(`Features aplicadas ao plano ${tier.plan_name || tier.plan_key}`);
                      }}
                    >
                      Aplicar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Features ({(tier.features || []).length})</p>
                  <ul className="space-y-1">
                    {(tier.features || []).map((f: string, j: number) => (
                      <li key={j} className="text-xs flex items-start gap-1.5">
                        <Check className="h-3 w-3 mt-0.5 shrink-0" style={{ color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                {(tier.differentiators || []).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Diferenciadores Exclusivos</p>
                      <ul className="space-y-1">
                        {tier.differentiators.map((d: string, j: number) => (
                          <li key={j} className="text-xs flex items-start gap-1.5">
                            <Sparkles className="h-3 w-3 mt-0.5 shrink-0" style={{ color }} />
                            <span className="font-medium">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {data?.cross_tier_analysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Análise Cruzada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.cross_tier_analysis}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Suggested Modules View ───
function SuggestedModulesView({ data }: { data: any }) {
  const modules = data?.modules || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {modules.map((mod: any, i: number) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{mod.icon_suggestion || "📦"}</span>
                <div>
                  <CardTitle className="text-sm">{mod.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{mod.category}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">€{mod.suggested_price}</p>
                <p className="text-[10px] text-muted-foreground">/mês</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">{mod.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px]">Min: {mod.target_plan}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(mod, null, 2));
                  toast.success("Detalhes copiados!");
                }}
              >
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">{mod.reasoning}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Bundles & Promotions View ───
function BundlesView({ data }: { data: any }) {
  const bundles = data?.bundles || [];
  const promotions = data?.promotions || [];

  return (
    <div className="space-y-6">
      {bundles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Gift className="h-4 w-4" /> Bundles Temáticos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundles.map((b: any, i: number) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{b.name}</CardTitle>
                    <Badge className="bg-green-100 text-green-800 text-[10px]">-{b.discount_percent}%</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {(b.modules_included || []).map((m: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Preço: <span className="font-bold text-foreground">€{b.price_bundle}/mês</span></span>
                    {b.price_individual && (
                      <span className="text-muted-foreground line-through">€{b.price_individual}/mês</span>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{b.target_segment}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {promotions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Promoções Temporárias</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promotions.map((p: any, i: number) => (
              <Card key={i} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800 text-[10px]">-{p.discount_percent}%</Badge>
                    <span className="text-xs text-muted-foreground">{p.valid_days} dias</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description || p.messaging}</p>
                  <Badge variant="secondary" className="text-[10px]">{p.target_segment}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
