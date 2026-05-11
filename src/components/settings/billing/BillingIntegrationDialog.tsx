import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BillingIntegration,
  BillingProvider,
  useSaveBillingIntegration,
  useTestBillingConnection,
} from "@/hooks/useBillingIntegrations";
import { normalizeInvoiceXpressAccountInput } from "@/utils/invoicexpress";
import { CheckCircle2, AlertTriangle, Loader2, Plug } from "lucide-react";

const PROVIDERS: { value: BillingProvider; label: string; supported: boolean }[] = [
  { value: "invoicexpress", label: "InvoiceXpress", supported: true },
  { value: "moloni", label: "Moloni (em breve)", supported: false },
  { value: "vendus", label: "Vendus (em breve)", supported: false },
  { value: "sage", label: "Sage (em breve)", supported: false },
  { value: "primavera", label: "Primavera (em breve)", supported: false },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: BillingIntegration | null;
}

export function BillingIntegrationDialog({ open, onOpenChange, editing }: Props) {
  const [provider, setProvider] = useState<BillingProvider>("invoicexpress");
  const [displayName, setDisplayName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultSerie, setDefaultSerie] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  const test = useTestBillingConnection();
  const save = useSaveBillingIntegration();

  useEffect(() => {
    if (open) {
      setProvider((editing?.provider as BillingProvider) || "invoicexpress");
      setDisplayName(editing?.display_name || "");
      setAccountName(editing?.account_name || "");
      setApiKey("");
      setDefaultSerie((editing?.config?.default_serie as string) || "");
      setIsActive(editing?.is_active ?? true);
      setIsDefault(editing?.is_default ?? false);
      test.reset();
    }
  }, [open, editing]);

  const handleTest = () => {
    const normalizedAccount = normalizeInvoiceXpressAccountInput(accountName);
    if (!normalizedAccount || !apiKey) return;
    setAccountName(normalizedAccount);
    test.mutate({ provider, account_name: normalizedAccount, api_key: apiKey });
  };

  const handleSave = () => {
    const normalizedAccount = normalizeInvoiceXpressAccountInput(accountName);
    setAccountName(normalizedAccount);
    save.mutate(
      {
        id: editing?.id,
        provider,
        display_name: displayName,
        account_name: normalizedAccount,
        api_key: apiKey || undefined,
        config: { default_serie: defaultSerie || undefined },
        is_active: isActive,
        is_default: isDefault,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const isInvoiceXpress = provider === "invoicexpress";
  const normalizedAccountName = normalizeInvoiceXpressAccountInput(accountName);
  const canSubmit = !!normalizedAccountName && (editing ? true : !!apiKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            {editing ? "Editar integração" : "Ligar fornecedor de faturação"}
          </DialogTitle>
          <DialogDescription>
            As credenciais são guardadas em segurança e usadas pelo backend.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Fornecedor</Label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as BillingProvider)}
              disabled={!!editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value} disabled={!p.supported}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nome da integração (opcional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex.: Conta principal"
              maxLength={120}
            />
          </div>

          {isInvoiceXpress && (
            <>
              <div>
                <Label>Nome da conta ou URL InvoiceXpress *</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  onBlur={() => setAccountName(normalizeInvoiceXpressAccountInput(accountName))}
                  placeholder="Ex.: simplesdivertidou ou https://simplesdivertidou.app.invoicexpress.com"
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usa o “Nome da conta” que aparece no InvoiceXpress. Também podes colar o URL completo; guardamos só o identificador necessário.
                </p>
              </div>

              <div>
                <Label>API Key {editing && "(deixar vazio para manter)"}</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editing ? editing.api_key_masked || "••••••••" : "Cola aqui a API key"}
                  maxLength={200}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Na documentação da InvoiceXpress: API key em Users/API; no painel costuma aparecer em Configurações → Integrações → API.
                </p>
              </div>

              <div>
                <Label>Série default para faturas (opcional)</Label>
                <Input
                  value={defaultSerie}
                  onChange={(e) => setDefaultSerie(e.target.value)}
                  placeholder="Ex.: A"
                  maxLength={20}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
              <Label htmlFor="active" className="cursor-pointer">Ativa</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} id="default" />
              <Label htmlFor="default" className="cursor-pointer">Definir como predefinida</Label>
            </div>
          </div>

          {test.data && (
            <Alert variant={test.data.ok ? "default" : "destructive"}>
              {test.data.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {test.data.ok
                  ? `Ligação OK${
                      test.data.account_info?.email
                        ? ` — ${test.data.account_info.email}`
                        : ""
                    }`
                  : `Falhou: ${test.data.error}`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!normalizedAccountName || !apiKey || test.isPending}
          >
            {test.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Testar ligação
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
