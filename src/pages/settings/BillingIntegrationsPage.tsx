import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BillingIntegration,
  useBillingIntegrations,
  useDeleteBillingIntegration,
  useSetDefaultBillingIntegration,
  useRecheckBillingIntegration,
} from "@/hooks/useBillingIntegrations";
import { BillingIntegrationDialog } from "@/components/settings/billing/BillingIntegrationDialog";
import { BillingSyncSheet } from "@/components/settings/billing/BillingSyncSheet";
import { getInvoiceXpressAccountUrl } from "@/utils/invoicexpress";
import {
  Plus,
  Plug,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Star,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const PROVIDER_LABEL: Record<string, string> = {
  invoicexpress: "InvoiceXpress",
  moloni: "Moloni",
  vendus: "Vendus",
  sage: "Sage",
  primavera: "Primavera",
};

function StatusBadge({ row }: { row: BillingIntegration }) {
  if (!row.last_check_status)
    return (
      <Badge variant="outline" className="gap-1">
        <HelpCircle className="h-3 w-3" /> Por testar
      </Badge>
    );
  if (row.last_check_status === "ok")
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Ligado
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1" title={row.last_check_error || undefined}>
      <AlertTriangle className="h-3 w-3" /> Erro
    </Badge>
  );
}

export default function BillingIntegrationsPage() {
  const { data, isLoading } = useBillingIntegrations();
  const del = useDeleteBillingIntegration();
  const setDefault = useSetDefaultBillingIntegration();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BillingIntegration | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BillingIntegration | null>(null);
  const [syncing, setSyncing] = useState<BillingIntegration | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (row: BillingIntegration) => {
    setEditing(row);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Plug className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Integrações de Faturação</h1>
              <p className="text-sm text-muted-foreground">
                Liga a tua conta de software de faturação por API. Cada workspace tem
                as suas próprias credenciais.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <a href="/settings/billing-integrations/sync">
                <RefreshCw className="h-4 w-4 mr-2" /> Sincronização
              </a>
            </Button>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Ligar fornecedor
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedores ligados</CardTitle>
            <CardDescription>
              A integração marcada como predefinida é a usada por defeito quando se
              gera uma fatura a partir do CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Plug className="h-8 w-8 mx-auto mb-3 opacity-30" />
                Ainda não há integrações de faturação configuradas.
                <div className="mt-3">
                  <Button onClick={openNew} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Ligar a primeira
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Última verificação</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">
                          {PROVIDER_LABEL[row.provider] || row.provider}
                        </div>
                        {row.display_name && (
                          <div className="text-xs text-muted-foreground">
                            {row.display_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.provider === "invoicexpress" ? (
                          <a
                            href={getInvoiceXpressAccountUrl(row.account_name)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {row.account_name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          row.account_name
                        )}
                        {row.api_key_masked && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {row.api_key_masked}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge row={row} />
                        {!row.is_active && (
                          <Badge variant="outline" className="ml-2">
                            Desativada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.is_default ? (
                          <Badge className="gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                            <Star className="h-3 w-3" /> Predefinida
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDefault.mutate(row.id)}
                          >
                            Definir
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.last_check_at
                          ? new Date(row.last_check_at).toLocaleString("pt-PT")
                          : "—"}
                        {row.last_check_error && (
                          <div
                            className="text-destructive truncate max-w-[280px]"
                            title={row.last_check_error}
                          >
                            {row.last_check_error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {row.provider === "invoicexpress" && (
                              <DropdownMenuItem onClick={() => setSyncing(row)}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar faturas
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmDelete(row)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <BillingIntegrationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
        />

        <BillingSyncSheet
          integration={syncing}
          open={!!syncing}
          onOpenChange={(o) => !o && setSyncing(null)}
        />

        <AlertDialog
          open={!!confirmDelete}
          onOpenChange={(o) => !o && setConfirmDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover integração?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação remove a ligação a{" "}
                <strong>{confirmDelete && PROVIDER_LABEL[confirmDelete.provider]}</strong>{" "}
                ({confirmDelete?.account_name}). As faturas já emitidas no fornecedor não
                são afetadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => {
                  if (confirmDelete) del.mutate(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
