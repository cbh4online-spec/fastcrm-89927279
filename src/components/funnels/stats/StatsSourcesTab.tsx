import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Line, ComposedChart
} from "recharts";
import { ExternalLink, Search } from "lucide-react";
import { type SourceData, getPerformanceBadge, getSourceRecommendation } from "./statsHelpers";

interface Props {
  sources: SourceData[];
}

export function StatsSourcesTab({ sources }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return sources;
    const q = search.toLowerCase();
    return sources.filter(s => s.name.toLowerCase().includes(q));
  }, [sources, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.rate - a.rate), [filtered]);

  return (
    <div className="space-y-4">
      <Card className="border-white/[0.08] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-amber-400" />
            Fontes de Tráfego
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={sorted.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" angle={-30} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="views" fill="#F5A623" name="Visitas" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar yAxisId="left" dataKey="submissions" fill="#1D9E75" name="Conversões" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Taxa %" />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ExternalLink className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sem dados de fonte</p>
              <p className="text-xs">Use links com parâmetros UTM para rastrear origens de tráfego</p>
            </div>
          )}
        </CardContent>
      </Card>

      {sources.length > 0 && (
        <Card className="border-white/[0.08] rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Detalhe por Fonte</CardTitle>
              <div className="relative w-48">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar fontes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Visitas</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Ação Recomendada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(s => {
                    const badge = getPerformanceBadge(s.rate);
                    const rec = getSourceRecommendation(s);
                    return (
                      <TableRow key={s.name} className="group">
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.views}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.submissions}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.rate.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${badge.color}`}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{rec}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
