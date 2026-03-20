import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCampaignSuppressions } from '@/hooks/useCampaignSuppressions';
import { ShieldBan, Upload, Download, Trash2, Plus, Search, PieChart } from 'lucide-react';
import { toast } from 'sonner';

export default function SuppressionsPage() {
  const { suppressions, isLoading, addSuppression, removeSuppression, importSuppressions } = useCampaignSuppressions();
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [importText, setImportText] = useState('');

  const filtered = suppressions.filter(s => {
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterReason !== 'all' && s.reason !== filterReason) return false;
    return true;
  });

  const reasonCounts = suppressions.reduce((acc, s) => {
    acc[s.reason] = (acc[s.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const REASON_LABELS: Record<string, string> = {
    hard_bounce: 'Hard Bounce',
    soft_bounce: 'Soft Bounce',
    spam_complaint: 'Spam',
    unsubscribe: 'Cancelamento',
    manual: 'Manual',
  };

  const REASON_COLORS: Record<string, string> = {
    hard_bounce: 'bg-red-100 text-red-700',
    soft_bounce: 'bg-amber-100 text-amber-700',
    spam_complaint: 'bg-red-100 text-red-800',
    unsubscribe: 'bg-blue-100 text-blue-700',
    manual: 'bg-gray-100 text-gray-700',
  };

  const handleAdd = () => {
    if (!newEmail) return;
    addSuppression.mutate({ email: newEmail, reason: 'manual' }, {
      onSuccess: () => { setNewEmail(''); setShowAddDialog(false); },
    });
  };

  const handleImport = () => {
    const emails = importText.split(/[\n,;]/).map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { toast.error('Nenhum email válido'); return; }
    importSuppressions.mutate(
      emails.map(email => ({ email, reason: 'manual' })),
      { onSuccess: () => { setImportText(''); setShowImportDialog(false); } }
    );
  };

  const handleExport = () => {
    const csv = ['Email,Razão,Data\n', ...suppressions.map(s =>
      `${s.email},${s.reason},${new Date(s.created_at).toLocaleDateString('pt-PT')}\n`
    )].join('');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppressions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldBan className="h-6 w-6 text-primary" />
              Lista de Supressão
            </h1>
            <p className="text-muted-foreground mt-1">
              Emails excluídos do envio de campanhas
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Importar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Importar Supressões</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Cole os emails (um por linha ou separados por vírgula)..."
                    rows={8}
                  />
                  <Button onClick={handleImport} disabled={importSuppressions.isPending} className="w-full">
                    Importar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Supressão</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
                  <Button onClick={handleAdd} disabled={addSuppression.isPending} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(REASON_LABELS).map(([key, label]) => (
            <Card key={key}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{reasonCounts[key] || 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar email..." />
          </div>
          <Select value={filterReason} onValueChange={setFilterReason}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(REASON_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
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
                <TableHead>Razão</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.email}</TableCell>
                  <TableCell>
                    <Badge className={REASON_COLORS[s.reason] || ''} variant="secondary">
                      {REASON_LABELS[s.reason] || s.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('pt-PT')}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.reason === 'manual' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm('Remover esta supressão?')) {
                            removeSuppression.mutate(s.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'A carregar...' : 'Sem supressões'}
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
