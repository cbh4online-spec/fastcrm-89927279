import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import type { PartnerCartItem } from "@/types/partner";
import { validatePartnerQuantity, partnerCartItemKey } from "@/types/partner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerAuth } from "@/contexts/PartnerAuthContext";

interface PartnerCartContextValue {
  items: PartnerCartItem[];
  itemCount: number;
  subtotalNet: number;
  cartId: string | null;
  addItem: (item: PartnerCartItem) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  clearCart: () => void;
  poNumber: string;
  setPoNumber: (v: string) => void;
  orderNotes: string;
  setOrderNotes: (v: string) => void;
  couponCode: string | null;
  setCouponCode: (v: string | null) => void;
  loading: boolean;
  emitFunnelEvent: (eventType: string, payload?: Record<string, unknown>) => void;
}

const PartnerCartContext = createContext<PartnerCartContextValue | undefined>(undefined);

export function PartnerCartProvider({ children }: { children: ReactNode }) {
  const { partnerUser } = usePartnerAuth();
  const [items, setItems] = useState<PartnerCartItem[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Hydrate cart from server on auth ready
  useEffect(() => {
    let cancelled = false;
    if (!partnerUser) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('partner_carts')
        .select('id, items, po_number, notes, applied_coupon_code')
        .eq('partner_user_id', partnerUser.auth_user_id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[partner-cart] hydrate error', error);
      } else if (data) {
        setCartId(data.id);
        setItems((data.items as unknown as PartnerCartItem[]) || []);
        setPoNumber(data.po_number || "");
        setOrderNotes(data.notes || "");
        setCouponCode(data.applied_coupon_code || null);
      }
      setHydrated(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [partnerUser]);

  // Restore cart by token (?recover=)
  useEffect(() => {
    if (!partnerUser || !hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('recover');
    if (!token) return;

    (async () => {
      const { data } = await supabase.rpc('restore_partner_cart_by_token', { p_token: token });
      const result = data as { ok?: boolean; items?: PartnerCartItem[]; cart_id?: string; po_number?: string; notes?: string; applied_coupon_code?: string } | null;
      if (result?.ok) {
        setItems(result.items || []);
        if (result.cart_id) setCartId(result.cart_id);
        if (result.po_number) setPoNumber(result.po_number);
        if (result.notes) setOrderNotes(result.notes);
        if (result.applied_coupon_code) setCouponCode(result.applied_coupon_code);
        toast.success('Carrinho restaurado a partir do email');
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('recover');
        window.history.replaceState({}, '', url.toString());
      }
    })();
  }, [partnerUser, hydrated]);

  // Persist cart (debounced)
  useEffect(() => {
    if (!partnerUser || !hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const subtotal = items.reduce((s, i) => s + i.unit_price_net * i.quantity, 0);
      const payload = {
        workspace_id: partnerUser.workspace_id,
        partner_account_id: partnerUser.partner_account_id,
        partner_user_id: partnerUser.auth_user_id,
        items: items as any,
        po_number: poNumber || null,
        notes: orderNotes || null,
        applied_coupon_code: couponCode,
        subtotal_net: Math.round(subtotal * 100) / 100,
      };
      const { data, error } = await supabase
        .from('partner_carts')
        .upsert(payload, { onConflict: 'partner_user_id' })
        .select('id')
        .single();
      if (error) {
        console.error('[partner-cart] save error', error);
      } else if (data?.id) {
        setCartId(data.id);
      }
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [items, poNumber, orderNotes, couponCode, partnerUser, hydrated]);

  const emitFunnelEvent = useCallback((eventType: string, payload: Record<string, unknown> = {}) => {
    if (!partnerUser) return;
    supabase.from('partner_funnel_events').insert({
      workspace_id: partnerUser.workspace_id,
      partner_account_id: partnerUser.partner_account_id,
      partner_user_id: partnerUser.auth_user_id,
      cart_id: cartId,
      event_type: eventType as any,
      payload: payload as any,
    }).then(({ error }) => {
      if (error) console.warn('[partner-funnel]', error.message);
    });
  }, [partnerUser, cartId]);

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
        if (!v.valid) { toast.error(v.message); return prev; }
        return prev.map((i) => i.product_id === item.product_id ? { ...i, quantity: newQty } : i);
      }
      return [...prev, item];
    });

    emitFunnelEvent('add_to_cart', { product_id: item.product_id, quantity: item.quantity, sku: item.sku });
    toast.success(`${item.product_name} adicionado ao carrinho`);
  }, [emitFunnelEvent]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.product_id === productId);
      if (!item) return prev;
      if (quantity <= 0) return prev.filter((i) => i.product_id !== productId);
      const v = validatePartnerQuantity(quantity, item.moq, item.pack_size);
      if (!v.valid) { toast.error(v.message); return prev; }
      return prev.map((i) => i.product_id === productId ? { ...i, quantity } : i);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    emitFunnelEvent('remove_from_cart', { product_id: productId });
  }, [emitFunnelEvent]);

  const clearCart = useCallback(() => {
    setItems([]);
    setPoNumber("");
    setOrderNotes("");
    setCouponCode(null);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalNet = items.reduce((sum, i) => sum + i.unit_price_net * i.quantity, 0);

  return (
    <PartnerCartContext.Provider
      value={{
        items, itemCount, subtotalNet, cartId,
        addItem, updateQuantity, removeItem, clearCart,
        poNumber, setPoNumber, orderNotes, setOrderNotes,
        couponCode, setCouponCode,
        loading, emitFunnelEvent,
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
