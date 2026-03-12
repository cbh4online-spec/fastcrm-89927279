import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegisterPayment } from "@/hooks/useInvoicePayments";
import { CreditCard } from "lucide-react";

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceTotal: number;
  amountPaid: number;
  currency: string;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceTotal,
  amountPaid,
  currency,
}: RegisterPaymentDialogProps) {
  const { t } = useTranslation("invoices");
  const registerPayment = useRegisterPayment();
  const remaining = Math.max(0, invoiceTotal - amountPaid);

  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    await registerPayment.mutateAsync({
      invoice_id: invoiceId,
      amount: parsedAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod || undefined,
      reference: reference || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
    // Reset
    setAmount(remaining.toFixed(2));
    setReference("");
    setNotes("");
  };

  const handleFullPayment = () => {
    setAmount(remaining.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("registerPayment")}
          </DialogTitle>
          <DialogDescription>
            {t("remainingAmount")}: {formatCurrency(remaining)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">{t("paymentAmount")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFullPayment}
                className="text-xs h-7"
              >
                {t("fullPayment")}
              </Button>
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">{t("paymentDate")}</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectMethod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">{t("methodTransfer")}</SelectItem>
                <SelectItem value="mbway">{t("methodMBWay")}</SelectItem>
                <SelectItem value="multibanco">{t("methodMultibanco")}</SelectItem>
                <SelectItem value="cash">{t("methodCash")}</SelectItem>
                <SelectItem value="check">{t("methodCheck")}</SelectItem>
                <SelectItem value="card">{t("methodCard")}</SelectItem>
                <SelectItem value="other">{t("methodOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">{t("paymentReference")}</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t("referencePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("paymentNotes")}</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={registerPayment.isPending}>
              {t("confirmPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
