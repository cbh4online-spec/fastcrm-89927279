import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import { Sentry } from "@/lib/sentry";
import { trackEvent } from "@/lib/analytics";
import { calcSubtotal, moneyToNumber } from "@/lib/money";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
  sku?: string;
}

interface StoreCartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  /** Derived — kept as number for backward compat */
  totalItems: number;
  subtotal: number;
  /** Internal — workspace context for analytics */
  _wsSlug: string;
  _wsId: string | undefined;
}

const SESSION_KEY = "store_view_session_id";
const SYNC_DEBOUNCE_MS = 2000;

// Debounced sync timers per workspace
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function syncToDb(items: CartItem[], subtotal: number) {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return;

  const cartData =
    items.length > 0
      ? items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          sku: i.sku,
        }))
      : null;

  (supabase as any)
    .from("store_visitor_sessions")
    .update({
      cart_items: cartData,
      cart_subtotal: items.length > 0 ? subtotal : 0,
      cart_updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .then(({ error }: any) => {
      if (error) {
        console.warn("[ECOMMERCE] CART_SYNC_FAILED", error.message);
        try { Sentry.captureException(new Error(`Cart sync failed: ${error.message}`)); } catch {}
      }
    });
}

function debouncedSync(wsSlug: string, items: CartItem[], subtotal: number) {
  const existing = syncTimers.get(wsSlug);
  if (existing) clearTimeout(existing);

  syncTimers.set(
    wsSlug,
    setTimeout(() => {
      syncToDb(items, subtotal);
      syncTimers.delete(wsSlug);
    }, SYNC_DEBOUNCE_MS),
  );
}

function computeDerived(items: CartItem[]) {
  return {
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: moneyToNumber(calcSubtotal(items)),
  };
}

// Factory — one store per workspaceSlug
const storeCache = new Map<string, ReturnType<typeof createCartStore>>();

function createCartStore(wsSlug: string) {
  return create<StoreCartState>()(
    persist(
      (set, get) => ({
        items: [],
        isOpen: false,
        totalItems: 0,
        subtotal: 0,
        _wsSlug: wsSlug,
        _wsId: undefined,

        addItem: (item, quantity = 1) => {
          set((state) => {
            const existing = state.items.find((i) => i.productId === item.productId);
            const newItems = existing
              ? state.items.map((i) =>
                  i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i,
                )
              : [...state.items, { ...item, quantity }];
            const derived = computeDerived(newItems);
            debouncedSync(wsSlug, newItems, derived.subtotal);
            trackEvent("add_to_cart", {
              workspaceSlug: wsSlug,
              productId: item.productId,
              productName: item.name,
              quantity,
              currency: item.currency,
            });
            return { items: newItems, isOpen: true, ...derived };
          });
        },

        removeItem: (productId) => {
          set((state) => {
            const removed = state.items.find((i) => i.productId === productId);
            const newItems = state.items.filter((i) => i.productId !== productId);
            const derived = computeDerived(newItems);
            debouncedSync(wsSlug, newItems, derived.subtotal);
            if (removed) {
              trackEvent("remove_from_cart", {
                workspaceSlug: wsSlug,
                productId,
                productName: removed.name,
              });
            }
            return { items: newItems, ...derived };
          });
        },

        updateQuantity: (productId, quantity) => {
          set((state) => {
            const newItems =
              quantity <= 0
                ? state.items.filter((i) => i.productId !== productId)
                : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
            const derived = computeDerived(newItems);
            debouncedSync(wsSlug, newItems, derived.subtotal);
            return { items: newItems, ...derived };
          });
        },

        clearCart: () => {
          debouncedSync(wsSlug, [], 0);
          trackEvent("cart_cleared", { workspaceSlug: wsSlug });
          set({ items: [], totalItems: 0, subtotal: 0 });
        },

        setIsOpen: (open) => set({ isOpen: open }),
      }),
      {
        name: `store-cart:${wsSlug}`,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ items: state.items }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            const derived = computeDerived(state.items);
            state.totalItems = derived.totalItems;
            state.subtotal = derived.subtotal;
          }
        },
      },
    ),
  );
}

export function getStoreCartStore(wsSlug: string) {
  if (!storeCache.has(wsSlug)) {
    storeCache.set(wsSlug, createCartStore(wsSlug));
  }
  return storeCache.get(wsSlug)!;
}
