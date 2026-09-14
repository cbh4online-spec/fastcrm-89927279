import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCommerceFeedRuns, useCommerceFeeds } from "@/hooks/useAICommerce";

export function AICommerceLogs() {
  const { data: runs, isLoading } = useCommerceFeedRuns();
  const { data: feeds } = useCommerceFeeds();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const feedName = (id: string) => feeds?.find((f) => f.id === id)?.name || id.slice(0, 8);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Feed</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Produtos</TableHead>
              <TableHead className="text-right">Erros</TableHead>
              <TableHead className="text-right">Avisos</TableHead>
              <TableHead className="text-right">Duração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(runs || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sem execuções registadas.
                </TableCell>
              </TableRow>
            )}
            {(runs || []).map((run) => (
              <TableRow key={run.id}>
                <TableCell>{new Date(run.created_at).toLocaleString("pt-PT")}</TableCell>
                <TableCell>{feedName(run.feed_id)}</TableCell>
                <TableCell>
                  <Badge variant={run.status === "success" ? "default" : run.status === "error" ? "destructive" : "outline"}>
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{run.product_count}</TableCell>
                <TableCell className="text-right tabular-nums">{run.errors?.length ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{run.warnings?.length ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.duration_ms != null ? `${run.duration_ms} ms` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
