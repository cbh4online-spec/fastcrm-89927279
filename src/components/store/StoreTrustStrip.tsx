import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, RotateCcw, ShieldCheck, Headset } from "lucide-react";

interface StoreTrustStripProps {
  workspaceId: string;
  className?: string;
}

/**
 * Faixa de confiança da ficha de produto.
 * Só mostra informação real: métodos de envio ativos configurados na loja.
 * Os restantes sinais são factuais (direito de livre resolução PT e pagamento seguro).
 */
export function StoreTrustStrip({ workspaceId, className }: StoreTrustStripProps) {
  const { data: shipping } = useQuery({
    queryKey: ["store-trust-shipping", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipping_methods")
        .select("name, price, estimated_delivery, free_shipping_threshold")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{
        name: string;
        price: number | null;
        estimated_delivery: string | null;
        free_shipping_threshold: number | null;
      }>;
    },
  });

  const cheapest = shipping?.[0];
  const threshold = shipping
    ?.map((s) => s.free_shipping_threshold)
    .filter((v): v is number => typeof v === "number" && v > 0)
    .sort((a, b) => a - b)[0];

  const items = [
    cheapest?.estimated_delivery
      ? { icon: Truck, title: "Entrega", text: cheapest.estimated_delivery }
      : null,
    threshold
      ? { icon: Truck, title: "Portes grátis", text: `Em compras acima de €${threshold.toFixed(2)}` }
      : null,
    { icon: RotateCcw, title: "Devoluções", text: "14 dias para devolver (direito de livre resolução)" },
    { icon: ShieldCheck, title: "Pagamento seguro", text: "Dados encriptados no checkout" },
    { icon: Headset, title: "Apoio ao cliente", text: "Respondemos a todas as questões" },
  ].filter(Boolean) as Array<{ icon: typeof Truck; title: string; text: string }>;

  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className || ""}`}>
      {items.map((item) => (
        <li key={item.title} className="flex items-start gap-3 rounded-xl border bg-card/50 p-3">
          <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
