import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { useWorkspaceInstances, WorkspaceInstance, WorkspaceStatus } from "@/hooks/useWorkspaceInstances";
import { format } from "date-fns";

const statusColors: Record<WorkspaceStatus, string> = {
  active: "bg-green-500",
  suspended: "bg-yellow-500",
  inactive: "bg-gray-500",
  pending: "bg-blue-500",
};

const statusLabels: Record<WorkspaceStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  inactive: "Inativo",
  pending: "Pendente",
};

interface Props {
  onEdit: (instance: WorkspaceInstance) => void;
}

export function WorkspaceInstancesTable({ onEdit }: Props) {
  const { instances, isLoading, updateInstance, deleteInstance } = useWorkspaceInstances();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleStatusChange = (instance: WorkspaceInstance, newStatus: WorkspaceStatus) => {
    updateInstance.mutate({ id: instance.id, status: newStatus });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteInstance.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-4">A carregar instâncias...</div>;
  }

  if (instances.length === 0) {
    return (
      <div className="text-muted-foreground p-8 text-center border rounded-lg">
        Nenhuma instância configurada. Clique em "Nova Instância" para começar.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workspace</TableHead>
            <TableHead>URL Supabase</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow key={instance.id}>
              <TableCell className="font-medium">
                {instance.workspaces?.name ?? "—"}
                <div className="text-xs text-muted-foreground">
                  {instance.workspaces?.slug}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm max-w-[300px] truncate">
                {instance.supabase_url}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[instance.status]}>
                  {statusLabels[instance.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(instance.created_at), "dd/MM/yyyy HH:mm")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(instance)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    {instance.status === "active" ? (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(instance, "suspended")}
                      >
                        <PowerOff className="mr-2 h-4 w-4" />
                        Suspender
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(instance, "active")}
                      >
                        <Power className="mr-2 h-4 w-4" />
                        Ativar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(instance.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A instância será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
