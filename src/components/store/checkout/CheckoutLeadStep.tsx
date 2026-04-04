import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, ChevronRight } from "lucide-react";

interface CheckoutLeadStepProps {
  formData: { name: string; phone: string; email: string };
  fieldErrors: Record<string, string>;
  isStep1Valid: () => boolean;
  onFieldChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CheckoutLeadStep({ formData, fieldErrors, isStep1Valid, onFieldChange, onSubmit }: CheckoutLeadStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Identificação</h2>
        <p className="text-sm text-muted-foreground">Precisamos do seu contacto para atualizações da encomenda</p>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Nome completo *
            </Label>
            <Input
              id="name"
              placeholder="O seu nome completo"
              value={formData.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              required
              autoFocus
              className={fieldErrors.name ? "border-destructive" : ""}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="o-seu@email.com"
              value={formData.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              required
              className={fieldErrors.email ? "border-destructive" : ""}
            />
            {fieldErrors.email ? (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Para recibo e atualizações da encomenda</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Telefone *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+351 912 345 678"
              value={formData.phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              required
              className={fieldErrors.phone ? "border-destructive" : ""}
            />
            {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={!isStep1Valid()}>
        Continuar
        <ChevronRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
