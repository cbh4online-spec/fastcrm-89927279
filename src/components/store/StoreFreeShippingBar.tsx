import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Truck, PartyPopper } from "lucide-react";

interface StoreFreeShippingBarProps {
  subtotal: number;
  threshold?: number;
}

const FREE_SHIPPING_THRESHOLD = 50;

export function StoreFreeShippingBar({ subtotal, threshold = FREE_SHIPPING_THRESHOLD }: StoreFreeShippingBarProps) {
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);
  const achieved = remaining <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border bg-muted/30 p-3 space-y-2"
    >
      {achieved ? (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 text-sm font-medium text-success"
        >
          <PartyPopper className="h-4 w-4" />
          <span>Parabéns! Envio grátis!</span>
        </motion.div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 flex-shrink-0" />
          <span>
            Faltam <strong className="text-foreground">€{remaining.toFixed(2)}</strong> para envio grátis!
          </span>
        </div>
      )}
      <Progress value={progress} className="h-2" />
    </motion.div>
  );
}
