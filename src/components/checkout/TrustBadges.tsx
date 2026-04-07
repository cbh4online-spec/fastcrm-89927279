import { Shield, Lock, CreditCard, RotateCcw, Truck, BadgeCheck } from "lucide-react";

const badges = [
  { icon: Lock, label: "Pagamento Seguro", sublabel: "Encriptação SSL 256-bit" },
  { icon: Shield, label: "Dados Protegidos", sublabel: "RGPD Compliant" },
  { icon: CreditCard, label: "Stripe Certificado", sublabel: "PCI DSS Level 1" },
  { icon: RotateCcw, label: "Garantia de Reembolso", sublabel: "14 dias (DL 24/2014)" },
];

export function TrustBadges() {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {badges.map((b) => (
          <div
            key={b.label}
            className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <b.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight">{b.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{b.sublabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustBadgesInline() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-3">
      {badges.map((b) => (
        <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <b.icon className="h-3.5 w-3.5" />
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
