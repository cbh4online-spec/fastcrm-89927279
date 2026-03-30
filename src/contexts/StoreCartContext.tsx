import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getStoreCartStore, type CartItem } from "@/stores/useStoreCartStore";
import { useStore } from "zustand";

export type { CartItem };

interface StoreCartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const StoreCartContext = createContext<StoreCartContextType | null>(null);

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const slug = workspaceSlug || "_default";

  const store = useMemo(() => getStoreCartStore(slug), [slug]);

  const items = useStore(store, (s) => s.items);
  const isOpen = useStore(store, (s) => s.isOpen);
  const totalItems = useStore(store, (s) => s.totalItems);
  const subtotal = useStore(store, (s) => s.subtotal);
  const addItem = useStore(store, (s) => s.addItem);
  const removeItem = useStore(store, (s) => s.removeItem);
  const updateQuantity = useStore(store, (s) => s.updateQuantity);
  const clearCart = useStore(store, (s) => s.clearCart);
  const setIsOpen = useStore(store, (s) => s.setIsOpen);

  const value = useMemo<StoreCartContextType>(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isOpen, setIsOpen }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isOpen, setIsOpen],
  );

  return (
    <StoreCartContext.Provider value={value}>
      {children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart() {
  const ctx = useContext(StoreCartContext);
  if (!ctx) throw new Error("useStoreCart must be used within StoreCartProvider");
  return ctx;
}
