import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Trash2,
  FileText,
  Send,
  Copy,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useProposals, usePublishProposal, useDeleteProposal } from "@/hooks/useProposals";
import { CreateProposalDialog } from "./CreateProposalDialog";
import { ProposalDetailDialog } from "./ProposalDetailDialog";
import type { Proposal, ProposalStatus } from "@/types/proposal";

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  accepted: "Aceita",
  expired: "Expirada",
  rejected: "Rejeitada",
};

const statusColors: Record<ProposalStatus, string> = {
  draft: "secondary",
  published: "default",
  accepted: "default",
  expired: "destructive",
  rejected: "destructive",
};

export function ProposalsList() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: proposals, isLoading } = useProposals();
  const publishProposal = usePublishProposal();
  const deleteProposal = useDeleteProposal();

  const filteredProposals = proposals?.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.opportunity?.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.opportunity?.lead?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getPublicUrl = (slug: string) => {
    return `${window.location.origin}/p/${slug}`;
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(getPublicUrl(slug));
    toast.success("Link copiado!");
  };

  const handlePublish = async (id: string) => {
    await publishProposal.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProposal.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const formatCurrency = (value: number | null, currency = "BRL") => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">
            Gerencie suas propostas comerciais
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Proposta
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar propostas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !filteredProposals?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma proposta encontrada.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira proposta
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Oportunidade</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visualizações</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">{proposal.title}</TableCell>
                  <TableCell>{proposal.opportunity?.title || "-"}</TableCell>
                  <TableCell>{proposal.opportunity?.lead?.name || "-"}</TableCell>
                  <TableCell>
                    {formatCurrency(proposal.price, proposal.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusColors[proposal.status] as
                          | "default"
                          | "secondary"
                          | "destructive"
                      }
                      className={
                        proposal.status === "accepted"
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      {statusLabels[proposal.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{proposal.views_count}</TableCell>
                  <TableCell>
                    {format(new Date(proposal.created_at), "dd/MM/yyyy", {
                      locale: pt,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailId(proposal.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {proposal.status === "published" && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(getPublicUrl(proposal.slug), "_blank")
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir página
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(proposal.slug)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar link
                            </DropdownMenuItem>
                          </>
                        )}
                        {proposal.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handlePublish(proposal.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Publicar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(proposal.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreateProposalDialog open={createOpen} onOpenChange={setCreateOpen} />

      {detailId && (
        <ProposalDetailDialog
          open={!!detailId}
          onOpenChange={(open) => !open && setDetailId(null)}
          proposalId={detailId}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A proposta será permanentemente
              removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
