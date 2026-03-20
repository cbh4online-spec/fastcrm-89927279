import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldBan, Search, Upload, Download, Trash2, Plus, Loader2 } from 'lucide-react';
import { useCampaignSuppressions } from '@/hooks/useCampaignSuppressions';
import { toast } from 'sonner';
import { format } from 'date-fns';

const REASON_LABELS: Record<string, string> = {
  hard_bounce: 'Hard Bounce',
  soft_bounce: 'Soft Bounce',
  spam_complaint: 'Spam',
  unsubscribe: 'Cancelamento',
  manual: 'Manual',
};

const REASON_COLORS: Record<string, string> = {
  hard_bounce: 'destructive',
  soft_bounce: 'secondary',
  spam_complaint: 'destructive',
  unsubscribe: 'outline',
  manual: 'secondary',
};

export function SuppressionManagement() {
  const { suppressions, suppressionCount, isLoading, addSuppression, removeSuppression, importSuppressions } =
    useCampaignSuppressions();
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [newEmail, setNewEmail] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const filtered = suppressions.filter((s) => {
    const matchSearch = !search || s.email.toLowerCase().includes(search.toLowerCase());
    const matchReason = filterReason === 'all' || s.reason === filterReason;
    return matchSearch && matchReason;
  });

  const handleAddManual = async () => {
    if (!newEmail.trim()) return;
    try {
      await addSuppression.mutateAsync({ email: newEmail, reason: 'manual' });
      setNewEmail('');
      toast.success('Email adicionado à lista de supressão');
    } catch {
      toast.error('Erro ao adicionar supressão');
    }
  };

  const handleRemove = async () => {
    if (!deleteId) return;
    try {
      await removeSuppression.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success('Supressão removida');
    } catch {
      toast.error('Erro ao remover supressão');
    }
  };

  const handleImport = async () => {
    const emails = importText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    try {
      const count = await importSuppressions.mutateAsync(emails);
      setImportText('');
      setShowImport(false);
      toast.success(`${count} emails importados`);
    } catch {
      toast.error('Erro ao importar');
    }
  };

  const handleExport = () => {
    const csv = ['email,reason,created_at', ...suppressions.map((s) => `${s.email},${s.reason},${s.created_at}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppressions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count by reason for summary
  const reasonCounts = suppressions.reduce((acc, s) => {
    acc[s.reason] = (acc[s.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(REASON_LABELS).map(([key, label]) => (
          <Card key={key} className="p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{reasonCounts[key] || 0}</p>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
          <Upload className="h-4 w-4 mr-1" />
          Importar
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Exportar
        </Button>
      </div>

      {/* Import area */}
      {showImport && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium">Importar emails (um por linha ou separados por vírgula)</p>
          <textarea
            className="w-full h-24 rounded-md border px-3 py-2 text-sm font-mono"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="email1@example.com&#10;email2@example.com"
          />
          <Button size="sm" onClick={handleImport} disabled={importSuppressions.isPending}>
            {importSuppressions.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Importar {importText.split(/[\n,;]+/).filter(Boolean).length} emails
          </Button>
        </Card>
      )}

      {/* Add manual */}
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar email manualmente..."
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
        />
        <Button size="sm" onClick={handleAddManual} disabled={addSuppression.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Razão</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma supressão encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 100).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant={REASON_COLORS[s.reason] as any || 'secondary'}>
                      {REASON_LABELS[s.reason] || s.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {s.reason === 'manual' && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover supressão?</AlertDialogTitle>
            <AlertDialogDescription>
              Este email voltará a poder receber campanhas. Tem a certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
