import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
  sku?: string;
}

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

const STORAGE_KEY = "store-cart";
const SESSION_KEY = "store_view_session_id";
const SYNC_DEBOUNCE_MS = 2000;

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Save to localStorage
  useEffect(() => {
    saveCart(items);
  }, [items]);

  // Sync cart to DB (debounced) using session_id from visitor tracking
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(() => {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) return;

      const cartData = items.length > 0
        ? items.map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            sku: i.sku,
          }))
        : null;

      const subtotalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      supabase
        .from("store_visitor_sessions" as any)
        .update({
          cart_items: cartData,
          cart_subtotal: items.length > 0 ? subtotalValue : 0,
          cart_updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        } as any)
        .eq("session_id", sessionId)
        .then(({ error }) => {
          if (error) console.warn("[ECOMMERCE] CART_SYNC_FAILED", error.message);
        });
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setItems(prev =>
        prev.map(i => (i.productId === productId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <StoreCartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isOpen, setIsOpen }}
    >
      {children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart() {
  const ctx = useContext(StoreCartContext);
  if (!ctx) throw new Error("useStoreCart must be used within StoreCartProvider");
  return ctx;
}
