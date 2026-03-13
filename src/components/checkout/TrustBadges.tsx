import { Shield, Lock, CreditCard, RotateCcw } from "lucide-react";

const badges = [
  { icon: Lock, label: "Pagamento Seguro SSL" },
  { icon: Shield, label: "Dados Protegidos" },
  { icon: CreditCard, label: "Stripe Certificado" },
  { icon: RotateCcw, label: "Garantia de Reembolso" },
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      {badges.map((b) => (
        <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <b.icon className="h-3.5 w-3.5" />
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
