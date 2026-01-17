import { useState } from "react";
import { Plus, Edit2, Trash2, MoreHorizontal, Eye, CircleDollarSign, Crown, Zap } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { SaasPricingTableDialog } from "./SaasPricingTableDialog";
import { SaasPricingDetailSheet } from "./SaasPricingDetailSheet";
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
  useSaasPricingTables, 
  useDeleteSaasPricingTable,
  SaasPricingTable,
  pricingTypeLabels,
  targetSegmentLabels
} from "@/hooks/useSaasPricingTables";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function SaasPricingTab() {
  const { data: pricingTables, isLoading } = useSaasPricingTables();
  const deletePricingTable = useDeleteSaasPricingTable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<SaasPricingTable | null>(null);
  const [detailTable, setDetailTable] = useState<SaasPricingTable | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<SaasPricingTable | null>(null);

  const handleEdit = (table: SaasPricingTable) => {
    setEditingTable(table);
    setDialogOpen(true);
  };

  const handleDelete = (table: SaasPricingTable) => {
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (tableToDelete) {
      await deletePricingTable.mutateAsync(tableToDelete.id);
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTable(null);
  };

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
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
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tabelas de Preço SaaS</h2>
          <p className="text-sm text-muted-foreground">
            Configurar preços por segmento, volume ou promoções
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tabela
        </Button>
      </div>

      {pricingTables && pricingTables.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead className="text-center">Preço Base</TableHead>
                <TableHead className="text-center">Validade</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingTables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {table.is_default && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                      {table.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {pricingTypeLabels[table.pricing_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {table.target_segment ? (
                      <Badge variant="secondary">
                        {targetSegmentLabels[table.target_segment] || table.target_segment}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Todos</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {table.base_price ? formatCurrency(table.base_price) : "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {table.valid_from || table.valid_until ? (
                      <span>
                        {table.valid_from && format(new Date(table.valid_from), "dd/MM", { locale: pt })}
                        {table.valid_from && table.valid_until && " - "}
                        {table.valid_until && format(new Date(table.valid_until), "dd/MM", { locale: pt })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Permanente</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={table.is_active ? "default" : "secondary"}>
                      {table.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <CircleDollarSign className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Nenhuma tabela de preços
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie tabelas de preço para diferentes segmentos e promoções
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Primeira Tabela
          </Button>
        </Card>
      )}

      <SaasPricingTableDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        pricingTable={editingTable}
      />

      <SaasPricingDetailSheet
        pricingTable={detailTable}
        onClose={() => setDetailTable(null)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tabela de preços?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tabela "{tableToDelete?.name}" será
              permanentemente eliminada.
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
    </div>
  );
}
