import { Shield, Truck, HeadphonesIcon, CreditCard } from "lucide-react";

/**
 * AIDA — INTERESSE (Interest)
 * Blocos de confiança que geram credibilidade e interesse no visitante.
 */
export function StoreTrustSection() {
  const trustPoints = [
    {
      icon: Shield,
      title: "Pagamento Seguro",
      description: "Transações encriptadas e protegidas",
    },
    {
      icon: Truck,
      title: "Entrega Rápida",
      description: "Receba de forma rápida e cómoda",
    },
    {
      icon: HeadphonesIcon,
      title: "Suporte Dedicado",
      description: "Equipa pronta para ajudar",
    },
    {
      icon: CreditCard,
      title: "Satisfação Garantida",
      description: "Devolução sem complicações",
    },
  ];

  return (
    <section className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustPoints.map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <point.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{point.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
