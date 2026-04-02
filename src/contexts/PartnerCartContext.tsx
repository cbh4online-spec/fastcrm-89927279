import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { PartnerCartItem } from "@/types/partner";
import { validatePartnerQuantity } from "@/types/partner";
import { toast } from "sonner";

interface PartnerCartContextValue {
  items: PartnerCartItem[];
  itemCount: number;
  subtotalNet: number;
  addItem: (item: PartnerCartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  poNumber: string;
  setPoNumber: (v: string) => void;
  orderNotes: string;
  setOrderNotes: (v: string) => void;
}

const PartnerCartContext = createContext<PartnerCartContextValue | undefined>(undefined);

export function PartnerCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PartnerCartItem[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const addItem = useCallback((item: PartnerCartItem) => {
    const validation = validatePartnerQuantity(item.quantity, item.moq, item.pack_size);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === item.product_id);
      if (existing) {
        const newQty = existing.quantity + item.quantity;
        const v = validatePartnerQuantity(newQty, item.moq, item.pack_size);
        if (!v.valid) {
          toast.error(v.message);
          return prev;
        }
        return prev.map((i) =>
          i.product_id === item.product_id ? { ...i, quantity: newQty } : i
        );
      }
      return [...prev, item];
    });

    toast.success(`${item.product_name} adicionado ao carrinho`);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.product_id === productId);
      if (!item) return prev;

      if (quantity <= 0) {
        return prev.filter((i) => i.product_id !== productId);
      }

      const v = validatePartnerQuantity(quantity, item.moq, item.pack_size);
      if (!v.valid) {
        toast.error(v.message);
        return prev;
      }

      return prev.map((i) =>
        i.product_id === productId ? { ...i, quantity } : i
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPoNumber("");
    setOrderNotes("");
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalNet = items.reduce((sum, i) => sum + i.unit_price_net * i.quantity, 0);

  return (
    <PartnerCartContext.Provider
      value={{
        items,
        itemCount,
        subtotalNet,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        poNumber,
        setPoNumber,
        orderNotes,
        setOrderNotes,
      }}
    >
      {children}
    </PartnerCartContext.Provider>
  );
}

export function usePartnerCart() {
  const ctx = useContext(PartnerCartContext);
  if (!ctx) throw new Error("usePartnerCart must be used within PartnerCartProvider");
  return ctx;
}
