import { useState } from "react";
import { Plus, Edit2, Trash2, MoreHorizontal, DollarSign, Users, Calendar, Tag, Percent, Eye, Sparkles, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  usePriceTables,
  useDeletePriceTable,
  tableTypeLabels,
  PriceTable,
} from "@/hooks/usePriceTables";
import { PriceTableDialog } from "./PriceTableDialog";
import { PriceTableDetailSheet } from "./PriceTableDetailSheet";
import { AIOptimizePricingDialog } from "./pricing/AIOptimizePricingDialog";
import { AICustomerPricingDialog } from "./pricing/AICustomerPricingDialog";
import { usePricingOptimizer } from "@/hooks/usePricingOptimizer";
import { useProducts } from "@/hooks/useProducts";
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
import { toast } from "sonner";

const typeIcons: Record<string, React.ReactNode> = {
  segment: <Users className="h-4 w-4" />,
  volume: <Percent className="h-4 w-4" />,
  promotional: <Calendar className="h-4 w-4" />,
};

export function PricingTabContent() {
  const { data: tables, isLoading } = usePriceTables();
  const deleteTable = useDeletePriceTable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<PriceTable | null>(null);
  const [detailTable, setDetailTable] = useState<PriceTable | null>(null);
  const [aiOptimizeOpen, setAiOptimizeOpen] = useState(false);
  const [selectedTableForAI, setSelectedTableForAI] = useState<PriceTable | null>(null);
  const [aiCustomerOpen, setAiCustomerOpen] = useState(false);

  const { data: products } = useProducts();
  const { analyzeMargins, isLoading: aiLoading } = usePricingOptimizer();
  const [marginAnalysis, setMarginAnalysis] = useState<any>(null);
  const [showMarginAnalysis, setShowMarginAnalysis] = useState(false);

  const handleEdit = (table: PriceTable) => {
    setEditingTable(table);
    setDialogOpen(true);
  };

  const handleAIOptimize = (table: PriceTable) => {
    setSelectedTableForAI(table);
    setAiOptimizeOpen(true);
  };

  const handleAnalyzeMargins = async () => {
    if (!products || products.length === 0) {
      toast.error("Sem produtos para analisar");
      return;
    }

    try {
      const result = await analyzeMargins.mutateAsync({
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          basePrice: p.base_price,
          cost: p.direct_cost ?? undefined,
          category: p.category ?? undefined,
        })),
      });
      setMarginAnalysis(result);
      setShowMarginAnalysis(true);
    } catch (error) {
      toast.error("Erro ao analisar margens");
    }
  };

  const handleDelete = (table: PriceTable) => {
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (tableToDelete) {
      await deleteTable.mutateAsync(tableToDelete.id);
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTable(null);
  };

  const isExpired = (table: PriceTable) => {
    if (!table.valid_until) return false;
    return new Date(table.valid_until) < new Date();
  };

  const isUpcoming = (table: PriceTable) => {
    if (!table.valid_from) return false;
    return new Date(table.valid_from) > new Date();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="border rounded-lg">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Tools Card */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Otimização de Preços com IA</h3>
              <p className="text-xs text-muted-foreground">
                Use IA para maximizar rentabilidade e criar estratégias personalizadas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeMargins}
              disabled={aiLoading || !products?.length}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analisar Margens
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiCustomerOpen(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Preço por Cliente
            </Button>
          </div>
        </div>
      </Card>

      {/* Margin Analysis Results */}
      {showMarginAnalysis && marginAnalysis && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Análise de Margens</h3>
              <Badge variant={
                marginAnalysis.overallHealth === "good" ? "default" :
                marginAnalysis.overallHealth === "warning" ? "secondary" : "destructive"
              }>
                {marginAnalysis.overallHealth === "good" ? "Saudável" :
                 marginAnalysis.overallHealth === "warning" ? "Atenção" : "Crítico"}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowMarginAnalysis(false)}>
              ✕
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">{marginAnalysis.summary}</p>
          
          {marginAnalysis.alerts?.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium">Alertas</h4>
              {marginAnalysis.alerts.map((alert: any, i: number) => (
                <div key={i} className={`p-2 rounded text-sm ${
                  alert.severity === "high" ? "bg-destructive/10 text-destructive" :
                  alert.severity === "medium" ? "bg-yellow-500/10 text-yellow-700" :
                  "bg-blue-500/10 text-blue-700"
                }`}>
                  <strong>{alert.productName}:</strong> {alert.issue}
                  <p className="text-xs mt-1">{alert.recommendation}</p>
                </div>
              ))}
            </div>
          )}

          {marginAnalysis.opportunities?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Oportunidades</h4>
              {marginAnalysis.opportunities.map((opp: any, i: number) => (
                <div key={i} className="p-2 rounded bg-green-500/10 text-sm">
                  <strong className="text-green-700">{opp.description}</strong>
                  <p className="text-xs text-green-600 mt-1">{opp.potentialImpact}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tabelas de Preço</h2>
          <p className="text-sm text-muted-foreground">
            Gerir tabelas de preço por segmento, volume e promoções
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tabela
        </Button>
      </div>

      {tables && tables.length > 0 ? (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-center">Prioridade</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailTable(table)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {typeIcons[table.table_type]}
                      <span className="text-sm">{tableTypeLabels[table.table_type]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {table.name}
                    {table.is_default && (
                      <Badge variant="outline" className="ml-2 text-xs">Padrão</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {table.customer_segment || "—"}
                  </TableCell>
                  <TableCell>
                    {table.table_type === "promotional" ? (
                      <div className="text-sm">
                        {table.valid_from && (
                          <span>{format(new Date(table.valid_from), "dd MMM", { locale: pt })}</span>
                        )}
                        {table.valid_from && table.valid_until && <span> - </span>}
                        {table.valid_until && (
                          <span>{format(new Date(table.valid_until), "dd MMM yyyy", { locale: pt })}</span>
                        )}
                        {!table.valid_from && !table.valid_until && "—"}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{table.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {isExpired(table) ? (
                      <Badge variant="destructive">Expirada</Badge>
                    ) : isUpcoming(table) ? (
                      <Badge variant="outline">Futura</Badge>
                    ) : table.is_active ? (
                      <Badge variant="default">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailTable(table)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(table)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAIOptimize(table)}>
                          <Sparkles className="h-4 w-4 mr-2 text-primary" />
                          Otimizar com IA
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(table)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg bg-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <DollarSign className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Nenhuma tabela de preços criada
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie tabelas para definir preços por segmento, volume ou promoções
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Primeira Tabela
          </Button>
        </div>
      )}

      <PriceTableDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        table={editingTable}
      />

      {detailTable && (
        <PriceTableDetailSheet
          open={!!detailTable}
          onOpenChange={(open) => !open && setDetailTable(null)}
          tableId={detailTable.id}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tabela de preços?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tabela "{tableToDelete?.name}" e todos
              os seus preços serão permanentemente eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Optimize Dialog */}
      {selectedTableForAI && (
        <AIOptimizePricingDialog
          open={aiOptimizeOpen}
          onOpenChange={(open) => {
            setAiOptimizeOpen(open);
            if (!open) setSelectedTableForAI(null);
          }}
          priceTableId={selectedTableForAI.id}
          priceTableName={selectedTableForAI.name}
        />
      )}

      {/* AI Customer Pricing Dialog */}
      <AICustomerPricingDialog
        open={aiCustomerOpen}
        onOpenChange={setAiCustomerOpen}
      />
    </div>
  );
}
