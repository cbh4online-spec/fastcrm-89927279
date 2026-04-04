import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";

interface StoreAddToCartAnimationProps {
  trigger: number; // Increment to trigger
}

export function StoreAddToCartAnimation({ trigger }: StoreAddToCartAnimationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-xl shadow-primary/30"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 10 }}
          >
            <Check className="h-5 w-5" />
          </motion.div>
          <span className="text-sm font-medium">Adicionado ao carrinho!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
