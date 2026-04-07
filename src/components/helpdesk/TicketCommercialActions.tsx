import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, FileText, Receipt, ExternalLink, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import type { SupportTicket } from "@/hooks/useHelpdeskTickets";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";

interface TicketCommercialActionsProps {
  ticket: SupportTicket;
}

export function TicketCommercialActions({ ticket }: TicketCommercialActionsProps) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [dealTitle, setDealTitle] = useState(`Ticket #${ticket.ticket_number} — ${ticket.subject}`);
  const [dealValue, setDealValue] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");

  // Fetch pipeline stages
  const { data: stages } = useQuery({
    queryKey: ["pipeline-stages", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .eq("workspace_id", currentWorkspace!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id && showDealDialog,
  });

  // Fetch linked opportunity (if any)
  const { data: linkedDeal, refetch: refetchDeal } = useQuery({
    queryKey: ["ticket-linked-deal", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, title, value, status, currency")
        .eq("source", `ticket:${ticket.id}`)
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch linked proposals
  const { data: linkedProposals } = useQuery({
    queryKey: ["ticket-linked-proposals", linkedDeal?.id],
    queryFn: async () => {
      if (!linkedDeal?.id) return [];
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, status, price, currency")
        .eq("opportunity_id", linkedDeal.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!linkedDeal?.id,
  });

  // Fetch linked invoices
  const { data: linkedInvoices } = useQuery({
    queryKey: ["ticket-linked-invoices", linkedDeal?.id],
    queryFn: async () => {
      if (!linkedDeal?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, currency")
        .eq("opportunity_id", linkedDeal.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!linkedDeal?.id,
  });

  // Create opportunity mutation
  const createDeal = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          workspace_id: currentWorkspace!.id,
          title: dealTitle,
          value: parseFloat(dealValue) || 0,
          stage_id: selectedStageId,
          owner_id: user.id,
          contact_id: ticket.contact_id || null,
          company_id: ticket.company_id || null,
          source: `ticket:${ticket.id}`,
          notes: `Criado a partir do ticket #${ticket.ticket_number}\n${ticket.description || ""}`,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Oportunidade criada com sucesso");
      setShowDealDialog(false);
      refetchDeal();
    },
    onError: () => toast.error("Erro ao criar oportunidade"),
  });

  const handleCreateDeal = () => {
    if (!selectedStageId) {
      toast.error("Seleciona um estágio do pipeline");
      return;
    }
    createDeal.mutate();
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (!value) return "0€";
    return `${value.toLocaleString("pt-PT")}${currency === "EUR" ? "€" : ` ${currency}`}`;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      open: "Aberto", won: "Ganho", lost: "Perdido",
      draft: "Rascunho", sent: "Enviada", accepted: "Aceite", rejected: "Rejeitada",
      pending: "Pendente", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada",
    };
    return map[s] || s;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <Briefcase className="h-3 w-3" /> Comercial
      </h4>

      {/* Linked Opportunity */}
      {linkedDeal ? (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium truncate flex-1">{linkedDeal.title}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => navigate(`/dashboard/deals/${linkedDeal.id}`)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatCurrency(linkedDeal.value, linkedDeal.currency)}
            </span>
            <span>•</span>
            <span>{statusLabel(linkedDeal.status)}</span>
          </div>

          {/* Linked Proposals */}
          {(linkedProposals || []).length > 0 && (
            <div className="pt-1 space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Propostas</span>
              {linkedProposals!.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/dashboard/proposals/${p.id}`)}
                >
                  <span className="truncate">{p.title}</span>
                  <div className="flex items-center gap-1.5">
                    <span>{formatCurrency(p.price, p.currency)}</span>
                    <ChevronRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Linked Invoices */}
          {(linkedInvoices || []).length > 0 && (
            <div className="pt-1 space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Faturas</span>
              {linkedInvoices!.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}
                >
                  <span>#{inv.invoice_number}</span>
                  <div className="flex items-center gap-1.5">
                    <span>{formatCurrency(inv.total, inv.currency)}</span>
                    <span className="text-muted-foreground">{statusLabel(inv.status)}</span>
                    <ChevronRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions for existing deal */}
          <div className="flex gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] flex-1 gap-1"
              onClick={() => setShowProposalDialog(true)}
            >
              <FileText className="h-3 w-3" /> Nova Proposta
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] flex-1 gap-1"
              onClick={() => setShowInvoiceDialog(true)}
            >
              <Receipt className="h-3 w-3" /> Nova Fatura
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => {
            setDealTitle(`Ticket #${ticket.ticket_number} — ${ticket.subject}`);
            setShowDealDialog(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Criar Oportunidade
        </Button>
      )}

      {/* Create Deal Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Oportunidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Título</Label>
              <Input
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                className="mt-1"
                placeholder="Título da oportunidade"
              />
            </div>
            <div>
              <Label className="text-xs">Valor (€)</Label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className="mt-1"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-xs">Estágio do Pipeline</Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar estágio..." />
                </SelectTrigger>
                <SelectContent>
                  {(stages || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(ticket.contact_id || ticket.company_id) && (
              <p className="text-[10px] text-muted-foreground">
                O contacto e empresa do ticket serão vinculados automaticamente à oportunidade.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDealDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateDeal} disabled={createDeal.isPending}>
              {createDeal.isPending ? "A criar..." : "Criar Oportunidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
