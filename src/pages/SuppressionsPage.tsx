import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCampaignSuppressions } from '@/hooks/useCampaignSuppressions';
import {
  ShieldBan,
  Upload,
  Download,
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  XCircle,
  Ban,
  UserX,
  HandMetal,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/formatters';

const REASON_LABELS: Record<string, string> = {
  hard_bounce: 'Hard Bounce',
  soft_bounce: 'Soft Bounce',
  spam_complaint: 'Spam',
  unsubscribe: 'Cancelamento',
  manual: 'Manual',
};

const REASON_BADGE_VARIANT: Record<string, string> = {
  hard_bounce: 'bg-destructive/10 text-destructive border-destructive/20',
  soft_bounce: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  spam_complaint: 'bg-destructive/10 text-destructive border-destructive/20',
  unsubscribe: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  manual: 'bg-muted text-muted-foreground border-border',
};

const REASON_ICONS: Record<string, typeof AlertTriangle> = {
  hard_bounce: XCircle,
  soft_bounce: AlertTriangle,
  spam_complaint: Ban,
  unsubscribe: UserX,
  manual: HandMetal,
};

export default function SuppressionsPage() {
  const { suppressions, isLoading, suppressionCount, addSuppression, removeSuppression, importSuppressions } =
    useCampaignSuppressions();
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [importText, setImportText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = suppressions.filter((s) => {
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterReason !== 'all' && s.reason !== filterReason) return false;
    return true;
  });

  const reasonCounts = suppressions.reduce(
    (acc, s) => {
      acc[s.reason] = (acc[s.reason] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleAdd = () => {
    if (!newEmail) return;
    addSuppression.mutate(
      { email: newEmail, reason: 'manual' },
      {
        onSuccess: () => {
          setNewEmail('');
          setShowAddDialog(false);
          toast.success('Email adicionado à lista de supressão');
        },
      }
    );
  };

  const handleImport = () => {
    const emails = importText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {
      toast.error('Nenhum email válido encontrado');
      return;
    }

    importSuppressions.mutate(
      emails.map((email) => ({ email, reason: 'manual' })),
      {
        onSuccess: () => {
          setImportText('');
          setShowImportDialog(false);
          toast.success(`${emails.length} emails adicionados à lista de supressão`);
        },
      }
    );
  };

  const handleExport = () => {
    const rows = [
      'Email,Motivo,Data',
      ...filtered.map(
        (s) =>
          `${s.email},${REASON_LABELS[s.reason] || s.reason},${new Date(s.created_at).toLocaleDateString('pt-PT')}`
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppressions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lista exportada com sucesso');
  };

  const handleRemove = (id: string) => {
    removeSuppression.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        toast.success('Supressão removida');
      },
    });
  };

  const importPreviewCount = importText
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length;

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText((ev.target?.result as string) || '');
    };
    reader.readAsText(file);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldBan className="h-6 w-6 text-primary" />
              Lista de Supressão
            </h1>
            <p className="text-muted-foreground mt-1">
              {suppressionCount} emails excluídos do envio de campanhas
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Supressões</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                    Arrasta um ficheiro CSV aqui
                  </div>
                  <div className="text-center text-xs text-muted-foreground">ou</div>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Cola os emails, um por linha..."
                    rows={6}
                    className="font-mono text-xs"
                  />
                  {importPreviewCount > 0 && (
                    <p className="text-sm text-emerald-600">
                      {importPreviewCount} emails válidos encontrados
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleImport}
                    disabled={importSuppressions.isPending || importPreviewCount === 0}
                    className="w-full"
                  >
                    {importSuppressions.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Importar como supressão manual
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Supressão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    type="email"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleAdd} disabled={addSuppression.isPending || !newEmail} className="w-full">
                    Adicionar à lista de supressão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{suppressionCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            </CardContent>
          </Card>
          {Object.entries(REASON_LABELS).map(([key, label]) => {
            const Icon = REASON_ICONS[key] || AlertTriangle;
            return (
              <Card key={key}>
                <CardContent className="p-3 text-center">
                  <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold tabular-nums">{reasonCounts[key] || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar email..."
            />
          </div>
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motivos</SelectItem>
              {Object.entries(REASON_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="hidden md:table-cell">Campanha</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={REASON_BADGE_VARIANT[s.reason] || ''}
                    >
                      {REASON_LABELS[s.reason] || s.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(s.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.reason === 'manual' ? (
                      confirmDeleteId === s.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-muted-foreground mr-1">Tens a certeza?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleRemove(s.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        A carregar...
                      </div>
                    ) : (
                      'Sem supressões encontradas'
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
