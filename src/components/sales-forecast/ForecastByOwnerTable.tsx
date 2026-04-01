import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import type { ForecastByOwner } from "@/hooks/useSalesForecast";

interface Props {
  data: ForecastByOwner[];
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function ForecastByOwnerTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Forecast por Responsável</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            Sem dados para o período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Forecast por Responsável
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Deals</TableHead>
              <TableHead className="text-right">Pipeline</TableHead>
              <TableHead className="text-right">Ponderado</TableHead>
              <TableHead className="text-right">Win Rate</TableHead>
              <TableHead className="text-right">Ciclo Médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((owner) => (
              <TableRow key={owner.owner_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={owner.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{initials(owner.owner_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate max-w-[140px]">{owner.owner_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{owner.deal_count}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(owner.pipeline_value)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{fmt(owner.weighted_value)}</TableCell>
                <TableCell className="text-right tabular-nums">{owner.win_rate.toFixed(1)}%</TableCell>
                <TableCell className="text-right tabular-nums">{owner.avg_cycle_days > 0 ? `${owner.avg_cycle_days}d` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
