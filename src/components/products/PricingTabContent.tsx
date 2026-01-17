import { useState } from "react";
import { Plus, Edit2, Trash2, MoreHorizontal, DollarSign, Users, Calendar, Tag, Percent, Eye } from "lucide-react";
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

  const handleEdit = (table: PriceTable) => {
    setEditingTable(table);
    setDialogOpen(true);
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
    </div>
  );
}
