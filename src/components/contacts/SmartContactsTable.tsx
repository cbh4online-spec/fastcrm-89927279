import { useState } from "react";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, SmartContactsFilters } from "@/hooks/useSmartContacts";
import { useContacts } from "@/hooks/useContacts";
import { SmartContactsKPIs } from "./SmartContactsKPIs";
import { SmartContactsFilters as FiltersComponent } from "./SmartContactsFilters";
import { SmartContactRow } from "./SmartContactRow";
import { CreateContactDialog } from "./CreateContactDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, Trash2, Users, UserCog, HeadsetIcon, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ViewPreset = "all" | "sales" | "support" | "manager";

const viewPresets: Record<ViewPreset, { label: string; icon: React.ReactNode }> = {
  all: { label: "Todos", icon: <Users className="w-4 h-4" /> },
  sales: { label: "Vendas", icon: <UserCog className="w-4 h-4" /> },
  support: { label: "Suporte", icon: <HeadsetIcon className="w-4 h-4" /> },
  manager: { label: "Gestor", icon: <BarChart3 className="w-4 h-4" /> },
};

export function SmartContactsTable() {
  const [filters, setFilters] = useState<SmartContactsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeView, setActiveView] = useState<ViewPreset>("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();

  const allSelected = contacts && contacts.length > 0 && selectedIds.size === contacts.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(contacts?.map(c => c.id) || []));
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ contactId: id }); toast.success("Contacto analisado"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisados`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const shouldShowAdvanced = showAdvanced || activeView === "sales" || activeView === "manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tabela de Contactos Inteligente</h1>
          <p className="text-muted-foreground">Decide rapidamente o que fazer com cada contacto</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Contacto</Button>
        </div>
      </div>

      <SmartContactsKPIs />

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewPreset)}>
        <TabsList>
          {Object.entries(viewPresets).map(([key, preset]) => (
            <TabsTrigger key={key} value={key} className="gap-2">{preset.icon}{preset.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FiltersComponent filters={filters} onFiltersChange={setFilters} showAdvanced={shouldShowAdvanced} onToggleAdvanced={() => setShowAdvanced(!showAdvanced)} />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
          <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}><Sparkles className="w-4 h-4 mr-2" />Analisar com IA</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allSelected} ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead className="min-w-[180px]">Contacto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead><span className="flex items-center gap-1">Temperatura<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead><span className="flex items-center gap-1">Score<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="min-w-[150px]"><span className="flex items-center gap-1">Próxima Ação<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead>SLA</TableHead>
              {shouldShowAdvanced && (<><TableHead>Potencial €</TableHead><TableHead>Prob. %</TableHead><TableHead>Automação</TableHead><TableHead className="min-w-[180px]"><span className="flex items-center gap-1">Insight<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead></>)}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={shouldShowAdvanced ? 14 : 10} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />A carregar...</div></TableCell></TableRow>
            ) : !contacts?.length ? (
              <TableRow><TableCell colSpan={shouldShowAdvanced ? 14 : 10} className="text-center py-12"><div className="flex flex-col items-center gap-3 text-muted-foreground"><Users className="w-12 h-12 opacity-50" /><p className="text-lg font-medium">Quando entrarem contactos, a IA vai organizá-los por ti</p><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Contacto</Button></div></TableCell></TableRow>
            ) : contacts.map(c => (
              <SmartContactRow key={c.id} contact={c} isSelected={selectedIds.has(c.id)} onToggleSelect={() => toggleSelect(c.id)} onAnalyze={() => handleAnalyze(c.id)} isAnalyzing={analyzingId === c.id} showAdvanced={shouldShowAdvanced} />
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateContactDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Eliminar {selectedIds.size} contacto(s)?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
