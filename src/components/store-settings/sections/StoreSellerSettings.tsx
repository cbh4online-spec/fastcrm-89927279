import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SellerForm } from "@/lib/store/sellerInfo";

interface Props {
  form: SellerForm;
  onChange: (key: keyof SellerForm, value: string) => void;
}

/** Dados legais do vendedor mostrados nas Condições de Venda da loja. */
export function StoreSellerSettings({ form, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendedor e entrega</CardTitle>
        <CardDescription>
          Entidade que vende os produtos (pode ser diferente do nome da loja). Aparece nas Condições de Venda.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="seller_legal_name">Nome legal do vendedor</Label>
          <Input id="seller_legal_name" maxLength={200} value={form.seller_legal_name}
            onChange={(e) => onChange("seller_legal_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seller_tax_id">NIF</Label>
          <Input id="seller_tax_id" inputMode="numeric" maxLength={11} value={form.seller_tax_id}
            onChange={(e) => onChange("seller_tax_id", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="delivery_business_days">Prazo de entrega (dias úteis)</Label>
          <Input id="delivery_business_days" inputMode="numeric" maxLength={2} value={form.delivery_business_days}
            onChange={(e) => onChange("delivery_business_days", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="seller_address">Morada (sede)</Label>
          <Input id="seller_address" maxLength={300} value={form.seller_address}
            onChange={(e) => onChange("seller_address", e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
