import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OrderNote } from "@/types/order-note";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateDealFromOrderProps {
  order: OrderNote;
}

export function CreateDealFromOrder({ order }: CreateDealFromOrderProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [dealName, setDealName] = useState(`Encomenda ${order.order_number}`);
  const [dealValue, setDealValue] = useState(order.total_gross);
  const [notes, setNotes] = useState(`Originada da nota de encomenda ${order.order_number}`);
  const [stage, setStage] = useState("negotiation");

  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      // Get default pipeline
      const { data: pipelines } = await supabase
        .from("pipelines")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .limit(1);

      const pipelineId = pipelines?.[0]?.id;
      if (!pipelineId) throw new Error("Pipeline não encontrado");

      // Get contact_id from client_user if available
      let contactId = null;
      let companyId = null;

      if (order.client_user_id) {
        const { data: clientUser } = await supabase
          .from("client_users")
          .select("contact_id, company_id")
          .eq("id", order.client_user_id)
          .single();

        contactId = clientUser?.contact_id;
        companyId = clientUser?.company_id;
      }

      // Get the user id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      const { data: deal, error } = await supabase
        .from("opportunities")
        .insert({
          workspace_id: currentWorkspace.id,
          pipeline_id: pipelineId,
          name: dealName,
          value: dealValue,
          currency: order.currency || "EUR",
          stage,
          contact_id: contactId,
          company_id: companyId,
          notes,
          owner_id: user.id,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return deal;
    },
    onSuccess: (deal) => {
      toast.success("Oportunidade criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setOpen(false);
      navigate(`/dashboard/deals/${deal.id}`);
    },
    onError: (error) => {
      toast.error("Erro ao criar oportunidade: " + error.message);
    },
  });

  const handleCreate = () => {
    createDealMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Briefcase className="h-4 w-4 mr-2" />
          Criar Oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Oportunidade a partir da Encomenda</DialogTitle>
          <DialogDescription>
            Crie uma oportunidade no CRM baseada nesta nota de encomenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deal-name">Nome da Oportunidade</Label>
            <Input
              id="deal-name"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder="Nome da oportunidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-value">Valor (€)</Label>
            <Input
              id="deal-value"
              type="number"
              min={0}
              step={0.01}
              value={dealValue}
              onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Etapa</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger id="stage">
                <SelectValue placeholder="Selecionar etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualificado</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="negotiation">Negociação</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas sobre a oportunidade..."
            />
          </div>

          {order.client_user && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                A oportunidade será associada ao contacto/empresa do cliente:{" "}
                <span className="font-medium text-foreground">
                  {order.client_user.name}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createDealMutation.isPending || !dealName.trim()}
          >
            {createDealMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Criar Oportunidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
