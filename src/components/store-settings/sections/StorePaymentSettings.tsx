import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, Smartphone, Building2, Landmark } from "lucide-react";
import { useStoreSettings, useUpsertStoreSettings } from "@/hooks/useStoreSettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface PaymentMethods {
  stripe_card: boolean;
  mbway: boolean;
  multibanco: boolean;
  bank_transfer: boolean;
}

interface BankTransferDetails {
  bank_name: string;
  iban: string;
  bic_swift: string;
  account_holder: string;
  notes: string;
}

const DEFAULT_METHODS: PaymentMethods = {
  stripe_card: true,
  mbway: false,
  multibanco: false,
  bank_transfer: false,
};

const DEFAULT_BANK: BankTransferDetails = {
  bank_name: "",
  iban: "",
  bic_swift: "",
  account_holder: "",
  notes: "",
};

export function StorePaymentSettings() {
  const { data: settings } = useStoreSettings();
  const upsert = useUpsertStoreSettings();

  const [methods, setMethods] = useState<PaymentMethods>(DEFAULT_METHODS);
  const [bank, setBank] = useState<BankTransferDetails>(DEFAULT_BANK);

  useEffect(() => {
    if (settings) {
      const pm = (settings as any).payment_methods as PaymentMethods | undefined;
      if (pm) setMethods({ ...DEFAULT_METHODS, ...pm });
      const bd = (settings as any).bank_transfer_details as BankTransferDetails | undefined;
      if (bd) setBank({ ...DEFAULT_BANK, ...bd });
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate(
      { payment_methods: methods, bank_transfer_details: methods.bank_transfer ? bank : null } as any,
      { onSuccess: () => toast.success("Métodos de pagamento atualizados") }
    );
  };

  const toggleMethod = (key: keyof PaymentMethods) => {
    if (key === "stripe_card") return; // Always enabled
    setMethods((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const PAYMENT_OPTIONS = [
    {
      key: "stripe_card" as const,
      label: "Cartão de Crédito/Débito",
      description: "Visa, Mastercard, American Express via Stripe",
      icon: CreditCard,
      alwaysOn: true,
    },
    {
      key: "mbway" as const,
      label: "MB Way",
      description: "Pagamento via MB Way (requer Stripe com suporte PT)",
      icon: Smartphone,
      alwaysOn: false,
    },
    {
      key: "multibanco" as const,
      label: "Multibanco",
      description: "Referência Multibanco para pagamento em ATM ou homebanking",
      icon: Building2,
      alwaysOn: false,
    },
    {
      key: "bank_transfer" as const,
      label: "Transferência Bancária",
      description: "O cliente recebe os dados de transferência e paga manualmente",
      icon: Landmark,
      alwaysOn: false,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Métodos de Pagamento
          </CardTitle>
          <CardDescription>
            Configure quais métodos de pagamento estão disponíveis no checkout da loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PAYMENT_OPTIONS.map(({ key, label, description, icon: Icon, alwaysOn }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                checked={methods[key]}
                onCheckedChange={() => toggleMethod(key)}
                disabled={alwaysOn}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {methods.bank_transfer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Dados Bancários
            </CardTitle>
            <CardDescription>
              Estes dados serão exibidos ao cliente quando selecionar transferência bancária.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titular da Conta</Label>
                <Input
                  value={bank.account_holder}
                  onChange={(e) => setBank((b) => ({ ...b, account_holder: e.target.value }))}
                  placeholder="Nome da empresa ou titular"
                />
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input
                  value={bank.bank_name}
                  onChange={(e) => setBank((b) => ({ ...b, bank_name: e.target.value }))}
                  placeholder="Ex: Millennium BCP"
                />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={bank.iban}
                  onChange={(e) => setBank((b) => ({ ...b, iban: e.target.value }))}
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>BIC/SWIFT</Label>
                <Input
                  value={bank.bic_swift}
                  onChange={(e) => setBank((b) => ({ ...b, bic_swift: e.target.value }))}
                  placeholder="BCOMPTPL"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas adicionais</Label>
              <Input
                value={bank.notes}
                onChange={(e) => setBank((b) => ({ ...b, notes: e.target.value }))}
                placeholder="Ex: Indicar nº encomenda na descrição"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Pagamentos
        </Button>
      </div>
    </div>
  );
}
