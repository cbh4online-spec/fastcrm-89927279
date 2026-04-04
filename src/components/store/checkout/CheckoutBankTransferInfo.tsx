import { Copy, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BankDetails {
  bank_name?: string;
  iban?: string;
  bic_swift?: string;
  account_holder?: string;
  notes?: string;
}

interface Props {
  bankDetails: BankDetails;
  orderTotal: string;
  orderNumber?: string;
}

export function CheckoutBankTransferInfo({ bankDetails, orderTotal, orderNumber }: Props) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-800">
        <Landmark className="h-5 w-5" />
        <h3 className="font-semibold text-sm">Dados para Transferência Bancária</h3>
      </div>

      <div className="space-y-2 text-sm">
        {bankDetails.account_holder && (
          <Row label="Titular" value={bankDetails.account_holder} onCopy={copyToClipboard} />
        )}
        {bankDetails.bank_name && (
          <Row label="Banco" value={bankDetails.bank_name} />
        )}
        {bankDetails.iban && (
          <Row label="IBAN" value={bankDetails.iban} onCopy={copyToClipboard} mono />
        )}
        {bankDetails.bic_swift && (
          <Row label="BIC/SWIFT" value={bankDetails.bic_swift} onCopy={copyToClipboard} mono />
        )}
        <Row label="Montante" value={`€${orderTotal}`} />
        {orderNumber && (
          <Row label="Referência" value={orderNumber} onCopy={copyToClipboard} mono />
        )}
      </div>

      {bankDetails.notes && (
        <p className="text-xs text-amber-700 italic">{bankDetails.notes}</p>
      )}

      <p className="text-xs text-amber-700">
        Após a transferência, o pagamento será confirmado e a sua encomenda processada.
      </p>
    </div>
  );
}

function Row({ label, value, onCopy, mono }: { label: string; value: string; onCopy?: (text: string, label: string) => void; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
        {onCopy && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCopy(value, label)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
