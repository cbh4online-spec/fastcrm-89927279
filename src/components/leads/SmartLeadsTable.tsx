import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  useSmartLeads, 
  useAnalyzeLead, 
  useBulkAnalyzeLeads,
  SmartLeadsFilters,
  SmartLead
} from "@/hooks/useSmartLeads";
import { useDeleteLeads } from "@/hooks/useLeads";
import { SmartLeadsKPIs } from "./SmartLeadsKPIs";
import { SmartFilters } from "./SmartFilters";
import { SmartLeadRow } from "./SmartLeadRow";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Plus, 
  Sparkles, 
  Trash2, 
  Users,
  UserCog,
  HeadsetIcon,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewPreset = "all" | "sales" | "support" | "manager";

const viewPresets: Record<ViewPreset, { label: string; icon: React.ReactNode; description: string }> = {
  all: { label: "Todos", icon: <Users className="w-4 h-4" />, description: "Vista completa" },
  sales: { label: "Vendas", icon: <UserCog className="w-4 h-4" />, description: "Temperatura, potencial, probabilidade" },
  support: { label: "Suporte", icon: <HeadsetIcon className="w-4 h-4" />, description: "SLA, urgência, última mensagem" },
  manager: { label: "Gestor", icon: <BarChart3 className="w-4 h-4" />, description: "KPIs, conversões, receita" },
};

export function SmartLeadsTable() {
  const [filters, setFilters] = useState<SmartLeadsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeView, setActiveView] = useState<ViewPreset>("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: leads, isLoading, refetch } = useSmartLeads(filters);
  const deleteLeads = useDeleteLeads();
  const analyzeLead = useAnalyzeLead();
  const bulkAnalyze = useBulkAnalyzeLeads();

  const allSelected = leads && leads.length > 0 && selectedIds.size === leads.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else if (leads) {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await deleteLeads.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} lead(s) eliminados`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Erro ao eliminar leads");
    }
  };

  const handleAnalyzeLead = async (leadId: string) => {
    setAnalyzingId(leadId);
    try {
      await analyzeLead.mutateAsync({ leadId });
      toast.success("Lead analisado com sucesso");
    } catch (error: any) {
      if (error?.message?.includes("Rate limit")) {
        toast.error("Limite de requisições atingido. Tente novamente em alguns minutos.");
      } else if (error?.message?.includes("Payment required")) {
        toast.error("Créditos de IA esgotados. Adicione mais créditos para continuar.");
      } else {
        toast.error("Erro ao analisar lead");
      }
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;
    
    toast.loading(`A analisar ${selectedIds.size} leads...`);
    try {
      const result = await bulkAnalyze.mutateAsync(Array.from(selectedIds));
      toast.dismiss();
      toast.success(`${result.successful} leads analisados com sucesso${result.failed > 0 ? `, ${result.failed} falharam` : ""}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao analisar leads em massa");
    }
  };

  // Determine which advanced columns to show based on view preset
  const shouldShowAdvanced = showAdvanced || activeView === "sales" || activeView === "manager";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tabela de Leads Inteligente</h1>
          <p className="text-muted-foreground">
            Decide rapidamente o que fazer com cada lead
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <SmartLeadsKPIs />

      {/* View presets */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewPreset)}>
        <TabsList>
          {Object.entries(viewPresets).map(([key, preset]) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              {preset.icon}
              {preset.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <SmartFilters
        filters={filters}
        onFiltersChange={setFilters}
        showAdvanced={shouldShowAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkAnalyze}
              disabled={bulkAnalyze.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analisar com IA
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[180px]">Lead</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  Temperatura
                  <span className="text-[10px] text-muted-foreground">IA</span>
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  Score
                  <span className="text-[10px] text-muted-foreground">IA</span>
                </span>
              </TableHead>
              <TableHead className="min-w-[150px]">
                <span className="flex items-center gap-1">
                  Próxima Ação
                  <span className="text-[10px] text-muted-foreground">IA</span>
                </span>
              </TableHead>
              <TableHead>SLA</TableHead>
              {shouldShowAdvanced && (
                <>
                  <TableHead>Potencial €</TableHead>
                  <TableHead>Prob. %</TableHead>
                  <TableHead>Automação</TableHead>
                  <TableHead className="min-w-[180px]">
                    <span className="flex items-center gap-1">
                      Insight
                      <span className="text-[10px] text-muted-foreground">IA</span>
                    </span>
                  </TableHead>
                </>
              )}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={shouldShowAdvanced ? 13 : 9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p>A carregar leads...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !leads?.length ? (
              <TableRow>
                <TableCell colSpan={shouldShowAdvanced ? 13 : 9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Users className="w-12 h-12 opacity-50" />
                    {filters.smartFilter || filters.temperature !== "all" || filters.status !== "all" ? (
                      <>
                        <p className="text-lg font-medium">Nenhum lead encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros ou criar um novo lead</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">Quando entrarem leads, a IA vai organizá-los por ti</p>
                        <p className="text-sm">Adicione o primeiro lead para começar</p>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-2">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Lead
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <SmartLeadRow
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedIds.has(lead.id)}
                  onToggleSelect={() => toggleSelect(lead.id)}
                  onAnalyze={() => handleAnalyzeLead(lead.id)}
                  isAnalyzing={analyzingId === lead.id}
                  showAdvanced={shouldShowAdvanced}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Empty state for hot leads filter */}
      {filters.smartFilter === "hot" && leads?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma prioridade agora. Boa altura para follow-ups.</p>
        </div>
      )}

      {/* Dialogs */}
      <CreateLeadDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.size} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os leads selecionados e todas as suas conversas associadas serão permanentemente eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLeads.isPending ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}