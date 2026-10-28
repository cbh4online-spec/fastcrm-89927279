import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Undo2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDeleteInvoicePayment, useUpdateInvoicePayment } from "@/hooks/useInvoicePayments";
import { useCapability } from "@/hooks/useCapability";

export interface EditablePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes?: string | null;
  saft_import_id?: string | null;
  invoice_label?: string | null;
}

export const PAYMENT_METHODS: Record<string, string> = {
  transfer: "Transferência",
  mbway: "MB WAY",
  multibanco: "Multibanco",
  cash: "Numerário",
  check: "Cheque",
  card: "Cartão",
  manual: "Manual",
  other: "Outro",
};

const fmt = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

export function InvoicePaymentActions(props: { payment: EditablePayment; showOpenInvoice?: boolean }) {
  const canManage = useCapability("finance.manage");
  if (!canManage) return null;
  return <InvoicePaymentActionsInner {...props} />;
}

function InvoicePaymentActionsInner({ payment, showOpenInvoice = false }: { payment: EditablePayment; showOpenInvoice?: boolean }) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const update = useUpdateInvoicePayment();
  const remove = useDeleteInvoicePayment();

  const [form, setForm] = useState({ amount: "", payment_date: "", payment_method: "", reference: "", notes: "" });
  useEffect(() => {
    if (editOpen) {
      setForm({
        amount: String(payment.amount),
        payment_date: (payment.payment_date || "").slice(0, 10),
        payment_method: payment.payment_method || "",
        reference: payment.reference || "",
        notes: payment.notes || "",
      });
    }
  }, [editOpen, payment]);

  const methodOptions = { ...PAYMENT_METHODS, ...(payment.payment_method && !PAYMENT_METHODS[payment.payment_method] ? { [payment.payment_method]: payment.payment_method } : {}) };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do recibo">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showOpenInvoice && (
            <DropdownMenuItem onClick={() => navigate(`/dashboard/invoices/${payment.invoice_id}`)}>
              <FileText className="mr-2 h-4 w-4" /> Ver fatura
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Corrigir recibo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setVoidOpen(true)}>
            <Undo2 className="mr-2 h-4 w-4" /> Anular recibo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Corrigir recibo</DialogTitle>
            <DialogDescription>
              {payment.invoice_label ? `Fatura ${payment.invoice_label}. ` : ""}A fatura é recalculada ao guardar.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await update.mutateAsync({
                id: payment.id,
                invoice_id: payment.invoice_id,
                amount: parseFloat(form.amount.replace(",", ".")),
                payment_date: form.payment_date,
                payment_method: form.payment_method || null,
                reference: form.reference || null,
                notes: form.notes || null,
              });
              setEditOpen(false);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-amount">Valor (€)</Label>
                <Input id="ep-amount" type="number" step="0.01" min="0.01" required value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-date">Data</Label>
                <Input id="ep-date" type="date" required value={form.payment_date}
                  onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={form.payment_method || undefined} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue placeholder="Escolher método" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(methodOptions).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-ref">Referência</Label>
              <Input id="ep-ref" maxLength={120} value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-notes">Notas</Label>
              <Textarea id="ep-notes" maxLength={1000} rows={2} value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {payment.saft_import_id && (
              <p className="text-xs text-muted-foreground">Este recibo veio do SAF-T. Uma nova importação do mesmo ficheiro não o duplica.</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "A guardar…" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular este recibo de {fmt(payment.amount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              O recebimento é retirado e a fatura{payment.invoice_label ? ` ${payment.invoice_label}` : ""} volta a ficar por liquidar (ou parcial). A ação fica registada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">Motivo (opcional)</Label>
            <Input id="void-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: registado na fatura errada" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={async () => {
                await remove.mutateAsync({ id: payment.id, invoice_id: payment.invoice_id, reason });
                setReason("");
              }}
            >
              Anular recibo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
