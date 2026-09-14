import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAICommerceAnalytics } from "@/hooks/useAICommerce";

const money = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

export function AICommerceAnalytics() {
  const [days, setDays] = useState("30");
  const [country, setCountry] = useState("");
  const [campaign, setCampaign] = useState("");

  const { data, isLoading } = useAICommerceAnalytics({
    days: Number(days),
    country: country.trim() || null,
    campaign: campaign.trim() || null,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="period">Período</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={country}
              maxLength={5}
              placeholder="PT"
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign">Campanha</Label>
            <Input
              id="campaign"
              value={campaign}
              maxLength={120}
              onChange={(e) => setCampaign(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                  <TableHead className="text-right">Vistas de produto</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Carrinhos</TableHead>
                  <TableHead className="text-right">Checkouts</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      Sem eventos no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
                {(data || []).map((row) => (
                  <TableRow key={row.channel}>
                    <TableCell className="flex items-center gap-2">
                      {row.channel}
                      {row.isAi && <Badge variant="default">IA</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.visits}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.productViews}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.carts}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.checkouts}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.purchases}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.conversionRate.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
