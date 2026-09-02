import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CalendarDays, Save } from "lucide-react";
import { toast } from "sonner";
import { useUpdateInvoice, type Invoice } from "@/hooks/useInvoices";

interface EditInvoiceDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Pick<Invoice, "id" | "invoice_number" | "issue_date" | "due_date" | "status">;
}

const toInputDate = (value?: string | null) => (value ? String(value).slice(0, 10) : "");

export function EditInvoiceDatesDialog({ open, onOpenChange, invoice }: EditInvoiceDatesDialogProps) {
  const updateInvoice = useUpdateInvoice();
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setIssueDate(toInputDate(invoice.issue_date));
    setDueDate(toInputDate(invoice.due_date));
  }, [open, invoice.issue_date, invoice.due_date]);

  const invalidRange = Boolean(issueDate && dueDate && dueDate < issueDate);
  const locked = invoice.status === "cancelled";

  const handleSave = async () => {
    if (!issueDate) {
      toast.error("Indique a data de emissão");
      return;
    }
    if (invalidRange) {
      toast.error("A data de vencimento não pode ser anterior à data de emissão");
      return;
    }
    await updateInvoice.mutateAsync({
      id: invoice.id,
      issue_date: issueDate,
      due_date: dueDate || null,
    } as never);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Editar datas
          </DialogTitle>
          <DialogDescription>
            Fatura {invoice.invoice_number}. As datas afetam os cálculos de vencido/não vencido.
          </DialogDescription>
        </DialogHeader>

        {locked ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Faturas anuladas não podem ser alteradas.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice-issue-date">Data de emissão</Label>
              <Input
                id="invoice-issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-due-date">Data de vencimento</Label>
              <Input
                id="invoice-due-date"
                type="date"
                value={dueDate}
                min={issueDate || undefined}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {invalidRange && (
                <p className="text-xs text-destructive">
                  O vencimento tem de ser igual ou posterior à emissão.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={locked || invalidRange || !issueDate || updateInvoice.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateInvoice.isPending ? "A guardar..." : "Guardar datas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
