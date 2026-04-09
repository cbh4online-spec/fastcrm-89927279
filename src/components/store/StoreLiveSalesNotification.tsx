import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface SaleNotification {
  customerName: string;
  productName: string;
  city: string;
  timeAgo: string;
}

const CITIES = ["Lisboa", "Porto", "Braga", "Coimbra", "Faro", "Aveiro", "Setúbal", "Viseu", "Leiria", "Évora"];
const FIRST_NAMES = ["Ana", "João", "Maria", "Pedro", "Sofia", "Miguel", "Inês", "Diogo", "Beatriz", "Tiago", "Catarina", "Rui"];

function generateFallbackNotification(products: { name: string }[]): SaleNotification {
  const product = products[Math.floor(Math.random() * products.length)];
  const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const minsAgo = Math.floor(Math.random() * 45) + 2;
  return {
    customerName: name,
    productName: product.name,
    city,
    timeAgo: `há ${minsAgo} min`,
  };
}

interface StoreLiveSalesNotificationProps {
  workspaceId: string;
  products: { id: string; name: string; images?: string[] }[];
}

export function StoreLiveSalesNotification({ workspaceId, products }: StoreLiveSalesNotificationProps) {
  const [current, setCurrent] = useState<SaleNotification | null>(null);
  const [visible, setVisible] = useState(false);

  // Fetch recent real orders
  const { data: recentOrders } = useQuery({
    queryKey: ["store-live-sales", workspaceId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("store_orders")
        .select("customer_name, created_at, items")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as any[]) || [];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const showNotification = useCallback(() => {
    if (!products.length) return;

    let notification: SaleNotification;

    if (recentOrders && recentOrders.length > 0) {
      const order = recentOrders[Math.floor(Math.random() * recentOrders.length)];
      const firstName = (order.customer_name || "").split(" ")[0] || FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const items = Array.isArray(order.items) ? order.items : [];
      const productName = items[0]?.name || products[Math.floor(Math.random() * products.length)].name;
      notification = {
        customerName: firstName,
        productName,
        city: CITIES[Math.floor(Math.random() * CITIES.length)],
        timeAgo: formatDistanceToNow(new Date(order.created_at), { locale: pt, addSuffix: false }),
      };
    } else {
      notification = generateFallbackNotification(products);
    }

    setCurrent(notification);
    setVisible(true);
    setTimeout(() => setVisible(false), 5000);
  }, [products, recentOrders]);

  useEffect(() => {
    if (!products.length) return;
    // First show after 8-15s
    const initialDelay = setTimeout(showNotification, 8000 + Math.random() * 7000);
    // Then every 20-35s
    const interval = setInterval(() => {
      showNotification();
    }, 20000 + Math.random() * 15000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [showNotification]);

  return (
    <AnimatePresence>
      {visible && current && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-4 z-50 max-w-[300px] rounded-xl border bg-card shadow-xl p-3.5 cursor-pointer"
          onClick={() => setVisible(false)}
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                <span className="font-semibold">{current.customerName}</span> de{" "}
                <span className="text-primary">{current.city}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                comprou <span className="font-medium text-foreground">{current.productName}</span>
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {current.timeAgo.startsWith("há") ? current.timeAgo : `há ${current.timeAgo}`}
              </p>
            </div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 rounded-t-xl overflow-hidden">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-full bg-primary"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
