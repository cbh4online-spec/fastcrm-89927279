import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Zap, TrendingDown, Users, AlertTriangle, CheckCircle2, ShoppingCart, Sparkles, Info } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useRFQAnalysis, type AnalysisWeights, type AwardStrategy } from "@/hooks/useRFQAnalysis";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  rfqId: string;
  hasEditPermission: boolean;
}

const STRATEGY_OPTIONS: { value: AwardStrategy; label: string; icon: any; description: string }[] = [
  { value: "best_per_item", label: "Melhor por Item", icon: Trophy, description: "Escolhe o melhor fornecedor para cada item individualmente" },
  { value: "single_supplier", label: "Consolidação (1 Fornecedor)", icon: Users, description: "Consolida compras num único fornecedor para reduzir POs" },
  { value: "fastest_delivery", label: "Entrega Mais Rápida", icon: Zap, description: "Prioriza fornecedores com menor lead time" },
  { value: "lowest_total_cost", label: "Menor Custo Total", icon: TrendingDown, description: "Optimiza para o menor custo total possível" },
];

const DEFAULT_WEIGHTS: AnalysisWeights = { price: 45, lead_time: 25, moq: 15, preference: 10, quality: 5 };

export default function RFQAnalysisTab({ rfqId, hasEditPermission }: Props) {
  const navigate = useNavigate();
  const {
    analyzeRFQ, isAnalyzing,
    recommendAward, isRecommending,
    confirmAward, isConfirming,
    convertToPOs, isConverting,
    awards,
  } = useRFQAnalysis(rfqId);

  const [analysis, setAnalysis] = useState<any>(null);
  const [strategy, setStrategy] = useState<AwardStrategy>("best_per_item");
  const [weights, setWeights] = useState<AnalysisWeights>(DEFAULT_WEIGHTS);

  const latestAward = awards[0] as any;
  const awardItems = latestAward?.rfq_award_items || [];

  const handleAnalyze = async () => {
    const result = await analyzeRFQ(weights);
    if (result) setAnalysis(result);
  };

  const handleRecommend = async () => {
    await recommendAward({ strategy, weights_json: weights });
  };

  const handleConfirm = async () => {
    if (!latestAward) return;
    await confirmAward(latestAward.id);
  };

  const handleConvert = async () => {
    if (!latestAward) return;
    const result = await convertToPOs(latestAward.id);
    if (result?.count) {
      navigate("/dashboard/procurement/orders");
    }
  };

  const updateWeight = (key: keyof AnalysisWeights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  // Get unique suppliers from analysis
  const supplierColumns = useMemo(() => {
    if (!analysis?.matrix) return [];
    const sMap = new Map<string, string>();
    analysis.matrix.forEach((item: any) => {
      item.quotes.forEach((q: any) => {
        sMap.set(q.supplier_id, q.supplier_name);
      });
    });
    return Array.from(sMap.entries()).map(([id, name]) => ({ id, name }));
  }, [analysis]);

  // Best prices per item
  const bestPriceByItem = useMemo(() => {
    if (!analysis?.matrix) return {};
    const map: Record<string, number> = {};
    analysis.matrix.forEach((item: any) => {
      const prices = item.quotes.map((q: any) => q.effective_unit_price);
      if (prices.length) map[item.rfq_item_id] = Math.min(...prices);
    });
    return map;
  }, [analysis]);

  return (
    <div className="space-y-6">
      {/* Step 1: Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise & Sugestão de Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selector */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Estratégia</label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as AwardStrategy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {STRATEGY_OPTIONS.find(o => o.value === strategy)?.description}
              </p>
            </div>

            {/* Weights */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Pesos de Scoring</label>
              {[
                { key: "price" as const, label: "Preço", color: "text-green-600" },
                { key: "lead_time" as const, label: "Lead Time", color: "text-blue-600" },
                { key: "moq" as const, label: "MOQ/Sobrecompra", color: "text-orange-600" },
                { key: "preference" as const, label: "Preferência", color: "text-purple-600" },
                { key: "quality" as const, label: "Qualidade", color: "text-amber-600" },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={`text-xs w-28 ${color}`}>{label}</span>
                  <Slider
                    value={[weights[key]]}
                    onValueChange={([v]) => updateWeight(key, v)}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">{weights[key]}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analisar Cotações
            </Button>
            {analysis && hasEditPermission && (
              <Button onClick={handleRecommend} disabled={isRecommending} variant="secondary">
                {isRecommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                Gerar Recomendação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Comparison Matrix */}
      {analysis && (
        <>
          {/* Supplier Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {analysis.supplier_summary?.map((s: any, idx: number) => (
              <Card key={s.supplier_id} className={idx === 0 ? "border-primary ring-1 ring-primary/20" : ""}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm truncate">{s.supplier_name}</span>
                    {idx === 0 && <Badge className="bg-primary text-primary-foreground text-[10px]">Melhor</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Itens: {s.items_quoted}</span>
                    <span className="font-medium text-foreground">{formatCurrency(s.total_cost)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Matrix Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Matriz de Comparação</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Produto</TableHead>
                    <TableHead className="text-center w-16">Qtd</TableHead>
                    {supplierColumns.map(s => (
                      <TableHead key={s.id} className="text-center min-w-[180px]">{s.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.matrix.map((item: any) => (
                    <TableRow key={item.rfq_item_id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        <div>{item.product_name}</div>
                        {item.sku && <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>}
                      </TableCell>
                      <TableCell className="text-center">{item.qty}</TableCell>
                      {supplierColumns.map(s => {
                        const q = item.quotes.find((qq: any) => qq.supplier_id === s.id);
                        if (!q) return <TableCell key={s.id} className="text-center text-muted-foreground">—</TableCell>;

                        const isBest = q.effective_unit_price === bestPriceByItem[item.rfq_item_id];
                        const hasRisks = q.risk_flags?.length > 0;

                        return (
                          <TableCell key={s.id} className="text-center p-2">
                            <div className={`rounded-md p-2 space-y-1 ${isBest ? "bg-green-50 dark:bg-green-950/40 ring-1 ring-green-200 dark:ring-green-800" : ""}`}>
                              <div className="font-semibold text-sm">
                                {formatCurrency(q.effective_unit_price)}
                                {isBest && <Badge className="ml-1 bg-green-600 text-[9px] px-1">BEST</Badge>}
                              </div>
                              {q.discount_percent > 0 && (
                                <div className="text-[10px] text-muted-foreground">-{q.discount_percent}% desc.</div>
                              )}
                              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                                {q.lead_time_days != null && <span>📦 {q.lead_time_days}d</span>}
                                {q.min_order_qty && <span>MOQ: {q.min_order_qty}</span>}
                              </div>
                              {q.overbuy_qty > 0 && (
                                <div className="text-[10px] text-orange-600">+{q.overbuy_qty} sobrecompra</div>
                              )}
                              <div className="text-[10px] text-muted-foreground">
                                Total: {formatCurrency(q.line_total)}
                              </div>
                              {hasRisks && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-3 w-3 text-orange-500 inline" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {q.risk_flags.join(", ")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {q.supplier_ref && (
                                <div className="text-[10px] text-muted-foreground">Ref: {q.supplier_ref}</div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-muted/50 z-10 font-semibold">Total</TableCell>
                    <TableCell />
                    {supplierColumns.map(s => {
                      const total = analysis.matrix.reduce((sum: number, item: any) => {
                        const q = item.quotes.find((qq: any) => qq.supplier_id === s.id);
                        return sum + (q?.line_total || 0);
                      }, 0);
                      return (
                        <TableCell key={s.id} className="text-center font-semibold">
                          {formatCurrency(total)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-primary" />
                  Recomendações por Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Recomendado</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Preço Net</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Riscos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.recommendations.map((r: any) => (
                      <TableRow key={r.rfq_item_id}>
                        <TableCell className="font-medium">{r.product_name}</TableCell>
                        <TableCell>{r.qty_required}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.top3?.[0]?.supplier_name || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.score} className="h-2 w-16" />
                            <span className="text-xs font-mono">{r.score}</span>
                          </div>
                        </TableCell>
                        <TableCell>{r.top3?.[0]?.net_price != null ? formatCurrency(r.top3[0].net_price) : "—"}</TableCell>
                        <TableCell>{r.top3?.[0]?.lead_time != null ? `${r.top3[0].lead_time}d` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.rationale}</TableCell>
                        <TableCell>
                          {r.risk_flags?.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {r.risk_flags.map((f: string) => (
                                <Badge key={f} variant="outline" className="text-[10px] text-orange-600 border-orange-300">{f}</Badge>
                              ))}
                            </div>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {analysis.consolidation_suggestion && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-muted/50">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{analysis.consolidation_suggestion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Step 3: Award Builder */}
      {latestAward && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Adjudicação
              <Badge variant={
                latestAward.status === "draft" ? "secondary" :
                latestAward.status === "awarded" ? "default" : "outline"
              }>
                {latestAward.status === "draft" ? "Rascunho" :
                 latestAward.status === "awarded" ? "Confirmada" : "Convertida em PO"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Estratégia: <Badge variant="outline" className="ml-1">{latestAward.strategy}</Badge>
              {" · "}{awardItems.length} itens
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awardItems.map((ai: any) => (
                  <TableRow key={ai.id}>
                    <TableCell className="font-medium text-sm">{ai.rfq_item_id?.slice(0, 8)}...</TableCell>
                    <TableCell>{ai.selected_supplier_id?.slice(0, 8)}...</TableCell>
                    <TableCell>{ai.selected_qty}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{ai.rationale_text}</TableCell>
                    <TableCell>
                      {ai.score_json?.price != null && (
                        <div className="text-xs space-y-0.5">
                          <div>P:{ai.score_json.price} LT:{ai.score_json.lead_time} M:{ai.score_json.moq}</div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {hasEditPermission && (
              <div className="flex gap-2 pt-2">
                {latestAward.status === "draft" && (
                  <Button onClick={handleConfirm} disabled={isConfirming}>
                    {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Confirmar Adjudicação
                  </Button>
                )}
                {latestAward.status === "awarded" && (
                  <Button onClick={handleConvert} disabled={isConverting} className="bg-green-600 hover:bg-green-700">
                    {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    Gerar Ordens de Compra
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
