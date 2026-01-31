import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { CartItem, CartState, calculateVAT, calculateGross } from "@/types/order-note";

interface CartContextType {
  cart: CartState;
  addItem: (item: Omit<CartItem, 'line_total_net' | 'vat_amount' | 'line_total_gross'>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'client_portal_cart';

function calculateItemTotals(
  quantity: number,
  unitPriceNet: number,
  vatRate: number
): { line_total_net: number; vat_amount: number; line_total_gross: number } {
  const line_total_net = quantity * unitPriceNet;
  const vat_amount = calculateVAT(line_total_net, vatRate);
  const line_total_gross = line_total_net + vat_amount;
  return { line_total_net, vat_amount, line_total_gross };
}

function recalculateCartTotals(items: CartItem[]): { total_net: number; total_vat: number; total_gross: number } {
  return items.reduce(
    (acc, item) => ({
      total_net: acc.total_net + item.line_total_net,
      total_vat: acc.total_vat + item.vat_amount,
      total_gross: acc.total_gross + item.line_total_gross,
    }),
    { total_net: 0, total_vat: 0, total_gross: 0 }
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Invalid JSON, use default
        }
      }
    }
    return { items: [], total_net: 0, total_vat: 0, total_gross: 0 };
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addItem = useCallback((item: Omit<CartItem, 'line_total_net' | 'vat_amount' | 'line_total_gross'>) => {
    setCart((prev) => {
      const existingIndex = prev.items.findIndex((i) => i.product_id === item.product_id);
      
      let newItems: CartItem[];
      
      if (existingIndex >= 0) {
        // Update existing item quantity
        newItems = prev.items.map((i, idx) => {
          if (idx === existingIndex) {
            const newQuantity = i.quantity + item.quantity;
            const totals = calculateItemTotals(newQuantity, i.unit_price_net, i.vat_rate);
            return { ...i, quantity: newQuantity, ...totals };
          }
          return i;
        });
      } else {
        // Add new item
        const totals = calculateItemTotals(item.quantity, item.unit_price_net, item.vat_rate);
        newItems = [...prev.items, { ...item, ...totals }];
      }
      
      const cartTotals = recalculateCartTotals(newItems);
      return { items: newItems, ...cartTotals };
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setCart((prev) => {
      const newItems = prev.items.map((item) => {
        if (item.product_id === productId) {
          const totals = calculateItemTotals(quantity, item.unit_price_net, item.vat_rate);
          return { ...item, quantity, ...totals };
        }
        return item;
      });
      
      const cartTotals = recalculateCartTotals(newItems);
      return { items: newItems, ...cartTotals };
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((item) => item.product_id !== productId);
      const cartTotals = recalculateCartTotals(newItems);
      return { items: newItems, ...cartTotals };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({ items: [], total_net: 0, total_vat: 0, total_gross: 0 });
  }, []);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, updateQuantity, removeItem, clearCart, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
