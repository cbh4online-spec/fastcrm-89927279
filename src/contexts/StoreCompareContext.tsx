import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface CompareContextType {
  items: StoreProduct[];
  addItem: (product: StoreProduct) => void;
  removeItem: (productId: string) => void;
  clearAll: () => void;
  isInCompare: (productId: string) => boolean;
  isFull: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CompareContext = createContext<CompareContextType | null>(null);

const MAX_COMPARE = 3;

export function StoreCompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product: StoreProduct) => {
    setItems((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.find((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setIsOpen(false);
  }, []);

  const isInCompare = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items]
  );

  return (
    <CompareContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearAll,
        isInCompare,
        isFull: items.length >= MAX_COMPARE,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useStoreCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useStoreCompare must be used within StoreCompareProvider");
  return ctx;
}
