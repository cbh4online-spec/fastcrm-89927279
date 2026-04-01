import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Pencil,
  Trash2,
  Heart,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMCPProviders,
  useDeleteMCPProvider,
  useToggleMCPProvider,
  useHealthCheckMCP,
} from "@/hooks/useMarketingMCP";
import { MCPProviderDialog } from "./MCPProviderDialog";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface MCPProvidersPanelProps {
  workspaceId: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  connected: { label: "Conectado", variant: "default" },
  error: { label: "Erro", variant: "destructive" },
  unknown: { label: "Desconhecido", variant: "secondary" },
};

const KEY_LABELS: Record<string, string> = {
  figma: "Figma",
  git: "Git",
  custom: "Custom",
};

export function MCPProvidersPanel({ workspaceId }: MCPProvidersPanelProps) {
  const { data: providers, isLoading } = useMCPProviders(workspaceId);
  const deleteMutation = useDeleteMCPProvider(workspaceId);
  const toggleMutation = useToggleMCPProvider(workspaceId);
  const healthMutation = useHealthCheckMCP(workspaceId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<typeof providers extends (infer T)[] ? T : never | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (p: NonNullable<typeof providers>[number]) => {
    setEditProvider(p as any);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditProvider(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Providers MCP</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Providers MCP</CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {!providers?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum provider MCP configurado.</p>
              <p className="text-sm mt-1">Adicione um provider para começar a usar integrações MCP no marketing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Último Check</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => {
                    const st = STATUS_MAP[p.connection_status] || STATUS_MAP.unknown;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.provider_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{KEY_LABELS[p.provider_key] || p.provider_key}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={p.is_enabled}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ providerId: p.id, enable: checked })
                            }
                            disabled={toggleMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {p.is_default_for_pages && <Badge variant="outline" className="text-xs">Pages</Badge>}
                            {p.is_default_for_funnels && <Badge variant="outline" className="text-xs">Funnels</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.last_health_check_at
                            ? formatDistanceToNow(new Date(p.last_health_check_at), { addSuffix: true, locale: pt })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Health Check"
                              onClick={() => healthMutation.mutate(p.id)}
                              disabled={healthMutation.isPending}
                            >
                              {healthMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              onClick={() => setDeleteId(p.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {providers?.some((p) => p.last_error) && (
            <div className="mt-4 space-y-2">
              {providers.filter((p) => p.last_error).map((p) => (
                <div key={p.id} className="text-xs p-2 rounded bg-destructive/10 text-destructive">
                  <strong>{p.provider_name}:</strong> {p.last_error}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MCPProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        provider={editProvider}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Provider MCP</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Isto irá remover o provider e todos os bindings associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
