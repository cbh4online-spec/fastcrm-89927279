import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void;
  isLoading?: boolean;
  showShipping?: boolean;
}

export interface CheckoutFormData {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export function CheckoutForm({ onSubmit, isLoading, showShipping = true }: CheckoutFormProps) {
  const [form, setForm] = useState<CheckoutFormData>({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "PT",
  });

  const update = (field: keyof CheckoutFormData, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="João Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="joao@exemplo.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+351 912 345 678" />
          </div>
        </CardContent>
      </Card>

      {showShipping && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Morada de Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Morada *</Label>
              <Input id="address" required value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Rua Exemplo, 123" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input id="city" required value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Lisboa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Código Postal *</Label>
                <Input id="postalCode" required value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} placeholder="1000-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        Finalizar Compra
      </Button>
    </form>
  );
}
