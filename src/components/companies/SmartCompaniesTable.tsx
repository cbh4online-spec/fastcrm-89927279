import { useState } from "react";
import { useSmartCompanies, useAnalyzeCompany, useBulkAnalyzeCompanies, SmartCompaniesFilters } from "@/hooks/useSmartCompanies";
import { useCompanies } from "@/hooks/useCompanies";
import { SmartCompaniesKPIs } from "./SmartCompaniesKPIs";
import { SmartCompaniesFilters as FiltersComponent } from "./SmartCompaniesFilters";
import { SmartCompanyRow } from "./SmartCompanyRow";
import { CreateCompanyDialog } from "./CreateCompanyDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, Trash2, Building2, UserCog, HeadsetIcon, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ViewPreset = "all" | "sales" | "support" | "manager";

const viewPresets: Record<ViewPreset, { label: string; icon: React.ReactNode }> = {
  all: { label: "Todos", icon: <Building2 className="w-4 h-4" /> },
  sales: { label: "Vendas", icon: <UserCog className="w-4 h-4" /> },
  support: { label: "Suporte", icon: <HeadsetIcon className="w-4 h-4" /> },
  manager: { label: "Gestor", icon: <BarChart3 className="w-4 h-4" /> },
};

export function SmartCompaniesTable() {
  const [filters, setFilters] = useState<SmartCompaniesFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeView, setActiveView] = useState<ViewPreset>("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: companies, isLoading, refetch } = useSmartCompanies(filters);
  const { deleteCompany } = useCompanies();
  const analyze = useAnalyzeCompany();
  const bulkAnalyze = useBulkAnalyzeCompanies();

  const allSelected = companies && companies.length > 0 && selectedIds.size === companies.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(companies?.map(c => c.id) || []));
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ companyId: id }); toast.success("Empresa analisada"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisadas`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    toast.loading(`A eliminar ${ids.length} empresas...`);
    try {
      for (const id of ids) {
        await deleteCompany.mutateAsync(id);
      }
      toast.dismiss();
      toast.success(`${ids.length} empresa(s) eliminada(s)`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      refetch();
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao eliminar empresas");
    }
  };

  const shouldShowAdvanced = showAdvanced || activeView === "sales" || activeView === "manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tabela de Empresas Inteligente</h1>
          <p className="text-muted-foreground">Decide rapidamente o que fazer com cada empresa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Empresa</Button>
        </div>
      </div>

      <SmartCompaniesKPIs />

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
          <span className="text-sm text-muted-foreground">{selectedIds.size} selecionada(s)</span>
          <Button variant="outline" size="sm" onClick={handleBulkAnalyze} disabled={bulkAnalyze.isPending}><Sparkles className="w-4 h-4 mr-2" />Analisar com IA</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allSelected} ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead className="min-w-[180px]">Empresa</TableHead>
              <TableHead>Indústria</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead><span className="flex items-center gap-1">Temperatura<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead><span className="flex items-center gap-1">Score<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="min-w-[150px]"><span className="flex items-center gap-1">Próxima Ação<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead>SLA</TableHead>
              {shouldShowAdvanced && (<><TableHead>Potencial €</TableHead><TableHead>Prob. %</TableHead><TableHead>Funcionários</TableHead><TableHead>Automação</TableHead><TableHead className="min-w-[180px]"><span className="flex items-center gap-1">Insight<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead></>)}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={shouldShowAdvanced ? 15 : 10} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />A carregar...</div></TableCell></TableRow>
            ) : !companies?.length ? (
              <TableRow><TableCell colSpan={shouldShowAdvanced ? 15 : 10} className="text-center py-12"><div className="flex flex-col items-center gap-3 text-muted-foreground"><Building2 className="w-12 h-12 opacity-50" /><p className="text-lg font-medium">Quando entrarem empresas, a IA vai organizá-las por ti</p><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Empresa</Button></div></TableCell></TableRow>
            ) : companies.map(c => (
              <SmartCompanyRow key={c.id} company={c} isSelected={selectedIds.has(c.id)} onToggleSelect={() => toggleSelect(c.id)} onAnalyze={() => handleAnalyze(c.id)} isAnalyzing={analyzingId === c.id} showAdvanced={shouldShowAdvanced} />
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateCompanyDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.size} empresa(s)?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
