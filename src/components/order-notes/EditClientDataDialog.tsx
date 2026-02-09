import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useClientUserActions } from "@/hooks/useClientUsers";
import type { ClientUser, AddressData } from "@/types/client-user";

interface EditClientDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientUser: Pick<ClientUser, "id" | "name" | "email" | "phone" | "tax_id" | "billing_address" | "shipping_address">;
  onSuccess: () => void;
}

export function EditClientDataDialog({
  open,
  onOpenChange,
  clientUser,
  onSuccess,
}: EditClientDataDialogProps) {
  const { updateClient, isUpdating } = useClientUserActions();
  const [copyBilling, setCopyBilling] = useState(false);

  const [name, setName] = useState(clientUser.name);
  const [email, setEmail] = useState(clientUser.email);
  const [phone, setPhone] = useState(clientUser.phone || "");
  const [taxId, setTaxId] = useState(clientUser.tax_id || "");

  const [billingStreet, setBillingStreet] = useState(clientUser.billing_address?.street || "");
  const [billingPostalCode, setBillingPostalCode] = useState(clientUser.billing_address?.postal_code || "");
  const [billingCity, setBillingCity] = useState(clientUser.billing_address?.city || "");
  const [billingCountry, setBillingCountry] = useState(clientUser.billing_address?.country || "");

  const [shippingStreet, setShippingStreet] = useState(clientUser.shipping_address?.street || "");
  const [shippingPostalCode, setShippingPostalCode] = useState(clientUser.shipping_address?.postal_code || "");
  const [shippingCity, setShippingCity] = useState(clientUser.shipping_address?.city || "");
  const [shippingCountry, setShippingCountry] = useState(clientUser.shipping_address?.country || "");

  const handleCopyBilling = (checked: boolean) => {
    setCopyBilling(checked);
    if (checked) {
      setShippingStreet(billingStreet);
      setShippingPostalCode(billingPostalCode);
      setShippingCity(billingCity);
      setShippingCountry(billingCountry);
    }
  };

  const handleSave = async () => {
    const billing_address: AddressData = {
      street: billingStreet || undefined,
      postal_code: billingPostalCode || undefined,
      city: billingCity || undefined,
      country: billingCountry || undefined,
    };

    const shipping_address: AddressData = {
      street: shippingStreet || undefined,
      postal_code: shippingPostalCode || undefined,
      city: shippingCity || undefined,
      country: shippingCountry || undefined,
    };

    try {
      await updateClient({
        clientId: clientUser.id,
        updates: {
          name,
          phone: phone || undefined,
          tax_id: taxId || undefined,
          billing_address,
          shipping_address,
        },
      });
      onOpenChange(false);
      onSuccess();
    } catch {
      // error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dados do Cliente</DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente associado a esta encomenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome</Label>
              <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" value={email} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Telefone</Label>
              <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-tax-id">NIF</Label>
              <Input id="client-tax-id" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Endereço de Faturação</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billing-street">Rua</Label>
                <Input id="billing-street" value={billingStreet} onChange={(e) => setBillingStreet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-postal">Código Postal</Label>
                <Input id="billing-postal" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-city">Cidade</Label>
                <Input id="billing-city" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-country">País</Label>
                <Input id="billing-country" value={billingCountry} onChange={(e) => setBillingCountry(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Copy checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox id="copy-billing" checked={copyBilling} onCheckedChange={handleCopyBilling} />
            <Label htmlFor="copy-billing" className="text-sm cursor-pointer">
              Copiar endereço de faturação para envio
            </Label>
          </div>

          {/* Shipping Address */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Endereço de Envio</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="shipping-street">Rua</Label>
                <Input id="shipping-street" value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-postal">Código Postal</Label>
                <Input id="shipping-postal" value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-city">Cidade</Label>
                <Input id="shipping-city" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-country">País</Label>
                <Input id="shipping-country" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || !name.trim()}>
            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
