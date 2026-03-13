import { useState, useEffect } from "react";
import { ShoppingBag, X } from "lucide-react";

interface SocialProofPopupProps {
  enabled?: boolean;
  intervalMs?: number;
  products?: string[];
}

const names = ["João S.", "Maria L.", "Pedro C.", "Ana R.", "Carlos M.", "Sofia T.", "Ricardo B.", "Inês P."];
const cities = ["Lisboa", "Porto", "Braga", "Coimbra", "Faro", "Aveiro", "Setúbal", "Leiria"];

export function SocialProofPopup({ enabled = true, intervalMs = 15000, products = [] }: SocialProofPopupProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const name = names[Math.floor(Math.random() * names.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const product = products.length > 0 ? products[Math.floor(Math.random() * products.length)] : "um produto";
      const minutes = Math.floor(Math.random() * 30) + 1;
      setMessage(`${name} de ${city} comprou ${product} há ${minutes} min`);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, products]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-lg max-w-xs">
        <ShoppingBag className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs">{message}</p>
        <button onClick={() => setVisible(false)} className="shrink-0">
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
