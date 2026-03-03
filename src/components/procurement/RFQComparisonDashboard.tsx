import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";

interface Props {
  quotes: any[];
  items: any[];
  supplierIds: string[];
  supplierNames: Record<string, string>;
  selectedQuoteIds: string[];
  setSelectedQuoteIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
  "hsl(45, 80%, 55%)",
];

const BAR_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

interface SupplierScore {
  supplierId: string;
  name: string;
  priceScore: number;
  leadTimeScore: number;
  discountScore: number;
  coverageScore: number;
  total: number;
  totalQuoted: number;
  rank: number;
}

function computeScores(quotes: any[], items: any[], supplierIds: string[], supplierNames: Record<string, string>): SupplierScore[] {
  const totalItems = items.length;

  const supplierData = supplierIds.map(sid => {
    const sq = quotes.filter((q: any) => q.supplier_id === sid);
    const coverage = totalItems > 0 ? sq.length / totalItems : 0;
    const totalQuoted = sq.reduce((sum, q) => {
      const item = items.find((i: any) => i.id === q.rfq_item_id);
      const qty = item?.qty || 1;
      const discount = Number(q.discount_percent) || 0;
      return sum + Number(q.unit_price) * (1 - discount / 100) * qty;
    }, 0);
    const avgLeadTime = sq.length ? sq.reduce((s, q) => s + (Number(q.lead_time_days) || 0), 0) / sq.length : 999;
    const avgDiscount = sq.length ? sq.reduce((s, q) => s + (Number(q.discount_percent) || 0), 0) / sq.length : 0;

    return { supplierId: sid, name: supplierNames[sid] || sid.slice(0, 8), totalQuoted, avgLeadTime, avgDiscount, coverage };
  });

  const minTotal = Math.min(...supplierData.map(s => s.totalQuoted || Infinity));
  const maxTotal = Math.max(...supplierData.map(s => s.totalQuoted || 0));
  const minLead = Math.min(...supplierData.map(s => s.avgLeadTime));
  const maxLead = Math.max(...supplierData.map(s => s.avgLeadTime));
  const maxDiscount = Math.max(...supplierData.map(s => s.avgDiscount), 1);

  const scored: SupplierScore[] = supplierData.map(s => {
    const priceRange = maxTotal - minTotal;
    const priceScore = priceRange > 0 ? ((maxTotal - s.totalQuoted) / priceRange) * 100 : 100;

    const leadRange = maxLead - minLead;
    const leadTimeScore = leadRange > 0 ? ((maxLead - s.avgLeadTime) / leadRange) * 100 : 100;

    const discountScore = maxDiscount > 0 ? (s.avgDiscount / maxDiscount) * 100 : 0;
    const coverageScore = s.coverage * 100;

    const total = priceScore * 0.4 + leadTimeScore * 0.25 + discountScore * 0.15 + coverageScore * 0.2;

    return {
      supplierId: s.supplierId,
      name: s.name,
      priceScore: Math.round(priceScore),
      leadTimeScore: Math.round(leadTimeScore),
      discountScore: Math.round(discountScore),
      coverageScore: Math.round(coverageScore),
      total: Math.round(total),
      totalQuoted: s.totalQuoted,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.total - a.total);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}

export default function RFQComparisonDashboard({ quotes, items, supplierIds, supplierNames, selectedQuoteIds, setSelectedQuoteIds }: Props) {
  const scores = useMemo(() => computeScores(quotes, items, supplierIds, supplierNames), [quotes, items, supplierIds, supplierNames]);

  const bestPriceByItem = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item: any) => {
      const iq = quotes.filter((q: any) => q.rfq_item_id === item.id);
      if (iq.length) {
        map[item.id] = Math.min(...iq.map((q: any) => {
          const d = Number(q.discount_percent) || 0;
          return Number(q.unit_price) * (1 - d / 100);
        }));
      }
    });
    return map;
  }, [quotes, items]);

  const worstPriceByItem = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item: any) => {
      const iq = quotes.filter((q: any) => q.rfq_item_id === item.id);
      if (iq.length) {
        map[item.id] = Math.max(...iq.map((q: any) => {
          const d = Number(q.discount_percent) || 0;
          return Number(q.unit_price) * (1 - d / 100);
        }));
      }
    });
    return map;
  }, [quotes, items]);

  const barData = useMemo(() => scores.map(s => ({ name: s.name, total: s.totalQuoted })), [scores]);

  const radarData = useMemo(() => {
    return [
      { criterion: "Preço", ...Object.fromEntries(scores.map(s => [s.name, s.priceScore])) },
      { criterion: "Lead Time", ...Object.fromEntries(scores.map(s => [s.name, s.leadTimeScore])) },
      { criterion: "Desconto", ...Object.fromEntries(scores.map(s => [s.name, s.discountScore])) },
      { criterion: "Cobertura", ...Object.fromEntries(scores.map(s => [s.name, s.coverageScore])) },
    ];
  }, [scores]);

  // Compute supplier totals for the footer
  const supplierTotals = useMemo(() => {
    const map: Record<string, number> = {};
    supplierIds.forEach(sid => {
      map[sid] = quotes
        .filter((q: any) => q.supplier_id === sid)
        .reduce((sum, q) => {
          const item = items.find((i: any) => i.id === q.rfq_item_id);
          const qty = item?.qty || 1;
          const d = Number(q.discount_percent) || 0;
          return sum + Number(q.unit_price) * (1 - d / 100) * qty;
        }, 0);
    });
    return map;
  }, [quotes, items, supplierIds]);

  if (!quotes.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Comparação de Cotações</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Sem cotações registadas.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* A. Ranking Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking de Fornecedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scores.map((s, idx) => (
              <div
                key={s.supplierId}
                className={`relative rounded-lg border p-4 space-y-3 ${s.rank === 1 ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-muted-foreground">#{s.rank}</span>
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(s.totalQuoted)}</p>
                    </div>
                  </div>
                  {s.rank === 1 && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Star className="h-3 w-3" /> Recomendado
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-semibold">{s.total}/100</span>
                  </div>
                  <Progress value={s.total} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Preço: {s.priceScore}</span>
                  <span>Lead Time: {s.leadTimeScore}</span>
                  <span>Desconto: {s.discountScore}</span>
                  <span>Cobertura: {s.coverageScore}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* D. Bar Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Cotado por Fornecedor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* E. Radar Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Perfil Multi-Critério</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                {scores.map((s, i) => (
                  <Radar
                    key={s.supplierId}
                    name={s.name}
                    dataKey={s.name}
                    stroke={BAR_COLORS[i % BAR_COLORS.length]}
                    fill={BAR_COLORS[i % BAR_COLORS.length]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* C. Enhanced Comparison Table */}
      <Card>
        <CardHeader><CardTitle>Comparação Detalhada</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Produto</TableHead>
                <TableHead className="sticky left-[120px] bg-background z-10">Qtd</TableHead>
                {supplierIds.map(sid => (
                  <TableHead key={sid} className="text-center min-w-[160px]">
                    {supplierNames[sid] || sid.slice(0, 8)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {item.products?.name || "—"}
                  </TableCell>
                  <TableCell className="sticky left-[120px] bg-background z-10">{item.qty}</TableCell>
                  {supplierIds.map(sid => {
                    const q = quotes.find((qq: any) => qq.rfq_item_id === item.id && qq.supplier_id === sid);
                    if (!q) return <TableCell key={sid} className="text-center text-muted-foreground">—</TableCell>;
                    const discount = Number(q.discount_percent) || 0;
                    const finalPrice = Number(q.unit_price) * (1 - discount / 100);
                    const isBest = finalPrice === bestPriceByItem[item.id];
                    const isWorst = finalPrice === worstPriceByItem[item.id] && !isBest;

                    return (
                      <TableCell key={sid} className="text-center">
                        <div className={`space-y-1 rounded p-1.5 ${isBest ? "bg-green-50 dark:bg-green-950/40" : isWorst ? "bg-red-50 dark:bg-red-950/30" : ""}`}>
                          <div className="font-medium">{formatCurrency(finalPrice)}</div>
                          {discount > 0 && <div className="text-xs text-muted-foreground">-{discount}%</div>}
                          {q.lead_time_days && <div className="text-xs text-muted-foreground">{q.lead_time_days}d</div>}
                          {q.submitted_via_portal && <Badge variant="outline" className="text-[10px]">Portal</Badge>}
                          <Checkbox
                            checked={selectedQuoteIds.includes(q.id)}
                            onCheckedChange={(checked) => {
                              setSelectedQuoteIds(prev => {
                                const otherIds = quotes
                                  .filter((qq: any) => qq.rfq_item_id === item.id && qq.id !== q.id)
                                  .map((qq: any) => qq.id);
                                const filtered = prev.filter(id => !otherIds.includes(id));
                                return checked ? [...filtered, q.id] : filtered.filter(id => id !== q.id);
                              });
                            }}
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="sticky left-0 bg-muted/50 z-10 font-semibold" colSpan={1}>Total</TableCell>
                <TableCell className="sticky left-[120px] bg-muted/50 z-10" />
                {supplierIds.map(sid => (
                  <TableCell key={sid} className="text-center font-semibold">
                    {formatCurrency(supplierTotals[sid] || 0)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
