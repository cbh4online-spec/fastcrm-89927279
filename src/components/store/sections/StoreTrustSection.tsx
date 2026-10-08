import { Shield, Truck, HeadphonesIcon, CreditCard } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { businessDaysLabel } from "@/lib/store/sellerInfo";

/**
 * AIDA — INTERESSE (Interest)
 * Blocos de confiança que geram credibilidade e interesse no visitante.
 */
export function StoreTrustSection() {
  const slug = useLocation().pathname.match(/^\/store\/([^/]+)/)?.[1];
  const { workspaceId } = useResolveStoreWorkspace(slug);
  const { data: settings } = usePublicStoreSettings(workspaceId || "");
  const days = (settings as any)?.delivery_business_days as number | null | undefined;
  const trustPoints = [
    {
      icon: Shield,
      title: "Pagamento Seguro",
      description: "Transações encriptadas e protegidas",
    },
    {
      icon: Truck,
      title: "Envio",
      description: days
        ? `Entrega em ${businessDaysLabel(days)}; portes indicados antes de pagar`
        : "Custos de envio indicados antes de pagar",
    },
    {
      icon: HeadphonesIcon,
      title: "Apoio na escolha",
      description: "Tire dúvidas antes de comprar",
    },
    {
      icon: CreditCard,
      title: "Direitos do consumidor",
      description: "14 dias de livre resolução e garantia legal",
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
