import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActionRuns } from '@/hooks/useKernel';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export function ActionRunsPanel() {
  const { data = [], isLoading } = useActionRuns(100);

  const statusVariant = (s: string): any => s === 'succeeded' ? 'default' : s === 'failed' ? 'destructive' : 'secondary';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execuções de Ações</CardTitle>
        <p className="text-xs text-muted-foreground">Histórico das ações disparadas pelo Decision Engine.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma execução de ação ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Output / Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: pt })}</TableCell>
                  <TableCell className="font-mono text-xs">{r.action_key}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs max-w-md truncate">{r.error ?? (r.output ? JSON.stringify(r.output) : '—')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
