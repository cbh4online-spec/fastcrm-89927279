import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Mail, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { RenewalItem, RenewalContract } from "@/types/renewal";
import { RENEWAL_ITEM_TYPE_LABELS } from "@/types/renewal";

interface RenewalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: RenewalContract;
  items: RenewalItem[];
  onPaymentCreated?: (url: string) => void;
}

export function RenewalPaymentDialog({
  open, onOpenChange, contract, items, onPaymentCreated,
}: RenewalPaymentDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(items.map(i => i.id));
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const activeItems = items.filter(i => ["active", "pending_renewal", "overdue"].includes(i.status));

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectedTotal = activeItems
    .filter(i => selectedItemIds.includes(i.id))
    .reduce((sum, i) => sum + Number(i.qty) * Number(i.unit_price), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: contract.currency || "EUR" }).format(val);

  const handleGenerate = async () => {
    if (!currentWorkspace?.id || selectedItemIds.length === 0) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-renewal-payment-link", {
        body: {
          contract_id: contract.id,
          workspace_id: currentWorkspace.id,
          item_ids: selectedItemIds,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentUrl(data.url);
      onPaymentCreated?.(data.url);
      toast.success("Link de pagamento gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar link de pagamento");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      toast.success("Link copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerar Link de Pagamento
          </DialogTitle>
        </DialogHeader>

        {!paymentUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os itens a incluir no link de pagamento Stripe:
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {activeItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {RENEWAL_ITEM_TYPE_LABELS[item.item_type]}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(Number(item.qty) * Number(item.unit_price))}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={isLoading || selectedItemIds.length === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Gerar Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Link de pagamento gerado:</p>
              <p className="text-sm font-mono break-all">{paymentUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Link
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.open(paymentUrl, "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onPaymentCreated?.(paymentUrl);
              }}
            >
              <Mail className="mr-2 h-4 w-4" /> Enviar por Email
            </Button>

            <Button variant="ghost" className="w-full" onClick={() => { setPaymentUrl(null); onOpenChange(false); }}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
