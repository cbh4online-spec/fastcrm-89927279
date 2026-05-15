import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClientUsers } from "@/hooks/useClientUsers";
import { useCreateOrderNote } from "@/hooks/useCreateOrderNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, Search, Plus, Minus, ShoppingBag, Package, User, Send, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ClientUser, AddressData } from "@/types/client-user";

interface QuickProduct {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  base_price: number;
  category: string | null;
  stock_on_hand: number | null;
}

interface CartLine {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  unit_price_net: number;
  quantity: number;
  vat_rate: number;
}

const VAT_RATE = 23;

export function QuickOrderMode() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { clients } = useClientUsers();
  const createMutation = useCreateOrderNote();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Categories for quick filter
  const { data: categories = [] } = useQuery({
    queryKey: ["quick-order-categories", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .not("category", "is", null)
        .limit(500);
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.category && set.add(r.category));
      return Array.from(set).sort();
    },
    enabled: !!currentWorkspace?.id,
  });

  // Products
  const { data: products = [], isLoading } = useQuery<QuickProduct[]>({
    queryKey: ["quick-order-products", currentWorkspace?.id, debounced, activeCategory],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("products")
        .select("id, name, sku, images, primary_image_index, base_price, category, stock_on_hand")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("name")
        .limit(60);
      if (debounced) q = q.or(`name.ilike.%${debounced}%,sku.ilike.%${debounced}%`);
      if (activeCategory !== "all") q = q.eq("category", activeCategory);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((p: any) => {
        const idx = p.primary_image_index ?? 0;
        const img = p.images && p.images.length > 0 ? p.images[idx] || p.images[0] : null;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          image_url: img,
          base_price: p.base_price || 0,
          category: p.category,
          stock_on_hand: p.stock_on_hand,
        };
      });
    },
    enabled: !!currentWorkspace?.id,
  });

  // Quick lookup by SKU/barcode (when search has Enter, exact match)
  const handleSkuEnter = useCallback(() => {
    const term = search.trim();
    if (!term) return;
    const exact = products.find(
      (p) => p.sku?.toLowerCase() === term.toLowerCase()
    );
    if (exact) {
      addToCart(exact);
      setSearch("");
      setDebounced("");
      toast.success(`+1 ${exact.name}`, { duration: 1200 });
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [search, products]);

  const addToCart = useCallback((p: QuickProduct) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === p.id);
      if (existing) {
        return prev.map((c) =>
          c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          product_image_url: p.image_url,
          unit_price_net: p.base_price,
          quantity: 1,
          vat_rate: VAT_RATE,
        },
      ];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) =>
          c.product_id === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0);
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product_id === productId ? { ...c, quantity: Math.max(0, qty) } : c))
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  }, []);

  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const totals = useMemo(() => {
    let net = 0, vat = 0;
    cart.forEach((l) => {
      const lineNet = l.quantity * l.unit_price_net;
      net += lineNet;
      vat += lineNet * (l.vat_rate / 100);
    });
    return { net, vat, gross: net + vat };
  }, [cart]);

  const handleSelectClient = useCallback((c: ClientUser) => {
    setSelectedClient(c);
    setClientOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentWorkspace?.id) return;
    if (!selectedClient) {
      toast.error("Selecione um cliente primeiro");
      setClientOpen(true);
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione produtos à encomenda");
      return;
    }
    createMutation.mutate({
      workspace_id: currentWorkspace.id,
      client_user_id: selectedClient.id,
      status: "submitted",
      items: cart.map((l, idx) => ({
        product_id: l.product_id,
        product_name: l.product_name,
        product_sku: l.product_sku,
        product_image_url: l.product_image_url,
        quantity: l.quantity,
        unit_price_net: l.unit_price_net,
        vat_rate: l.vat_rate,
        position: idx,
        notes: null,
      })),
      billing_address: (selectedClient.billing_address as AddressData) || {},
      shipping_address: (selectedClient.shipping_address as AddressData) || {},
      client_notes: notes || undefined,
    });
  }, [currentWorkspace, selectedClient, cart, notes, createMutation]);

  const productInCart = useCallback(
    (id: string) => cart.find((c) => c.product_id === id),
    [cart]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar — sticky */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/order-notes")}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Client picker */}
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start h-11 text-left font-normal min-w-0"
              >
                <User className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">
                  {selectedClient ? selectedClient.name : "Selecionar cliente"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(96vw,420px)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Pesquisar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                  <CommandGroup>
                    {clients.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.email} ${c.tax_id || ""}`}
                        onSelect={() => handleSelectClient(c)}
                      >
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.email} {c.tax_id ? `• NIF: ${c.tax_id}` : ""}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Cart trigger */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="default" size="icon" className="relative h-11 w-11 shrink-0">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full text-[10px] flex items-center justify-center">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <CartSheet
              cart={cart}
              totals={totals}
              notes={notes}
              setNotes={setNotes}
              updateQty={updateQty}
              setQty={setQty}
              removeLine={removeLine}
              onClear={() => setCart([])}
              onSubmit={handleSubmit}
              isSubmitting={createMutation.isPending}
              clientName={selectedClient?.name || null}
            />
          </Sheet>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Pesquisar por nome ou SKU... (Enter para adicionar SKU)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSkuEnter();
                }
              }}
              className="pl-9 h-11"
              autoFocus
              inputMode="search"
              autoComplete="off"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setDebounced(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Limpar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            <CategoryChip
              label="Tudo"
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                active={activeCategory === c}
                onClick={() => setActiveCategory(c)}
              />
            ))}
          </div>
        )}
      </header>

      {/* Product grid */}
      <main className="flex-1 px-3 py-3 pb-32">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => {
              const inCart = productInCart(p.id);
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  inCartQty={inCart?.quantity || 0}
                  onAdd={() => addToCart(p)}
                  onInc={() => updateQty(p.id, +1)}
                  onDec={() => updateQty(p.id, -1)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Floating bottom bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-xl"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            Ver encomenda · {cartCount} {cartCount === 1 ? "item" : "itens"}
            <span className="ml-auto">€{totals.gross.toFixed(2)}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product, inCartQty, onAdd, onInc, onDec,
}: {
  product: QuickProduct;
  inCartQty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="group rounded-xl border bg-card overflow-hidden flex flex-col">
      <button
        onClick={onAdd}
        className="relative aspect-square bg-muted overflow-hidden"
        aria-label={`Adicionar ${product.name}`}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
        {inCartQty > 0 && (
          <Badge className="absolute top-2 right-2 h-6 min-w-6 px-1.5 rounded-full">
            {inCartQty}
          </Badge>
        )}
      </button>
      <div className="p-2.5 flex-1 flex flex-col gap-1">
        <p className="text-sm font-medium line-clamp-2 leading-tight min-h-[2.5rem]">
          {product.name}
        </p>
        {product.sku && (
          <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-semibold">€{product.base_price.toFixed(2)}</span>
          {inCartQty === 0 ? (
            <Button size="icon" className="h-8 w-8 rounded-full" onClick={onAdd}>
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={onDec}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-semibold w-5 text-center tabular-nums">
                {inCartQty}
              </span>
              <Button size="icon" className="h-7 w-7 rounded-full" onClick={onInc}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CartSheet({
  cart, totals, notes, setNotes, updateQty, setQty, removeLine,
  onClear, onSubmit, isSubmitting, clientName,
}: {
  cart: CartLine[];
  totals: { net: number; vat: number; gross: number };
  notes: string;
  setNotes: (v: string) => void;
  updateQty: (id: string, delta: number) => void;
  setQty: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  clientName: string | null;
}) {
  return (
    <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
      <SheetHeader className="p-4 border-b">
        <SheetTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Encomenda
          {clientName && (
            <span className="text-sm font-normal text-muted-foreground ml-1 truncate">
              · {clientName}
            </span>
          )}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Carrinho vazio</p>
          </div>
        ) : (
          cart.map((l) => {
            const lineGross = l.quantity * l.unit_price_net * (1 + l.vat_rate / 100);
            return (
              <div key={l.product_id} className="flex gap-3 py-2 border-b last:border-0">
                {l.product_image_url ? (
                  <img
                    src={l.product_image_url}
                    alt={l.product_name}
                    className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 leading-tight">
                    {l.product_name}
                  </p>
                  {l.product_sku && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {l.product_sku}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon" variant="outline" className="h-7 w-7 rounded-full"
                        onClick={() => updateQty(l.product_id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={l.quantity}
                        onChange={(e) => setQty(l.product_id, Number(e.target.value))}
                        className="h-7 w-12 text-center text-sm px-1"
                      />
                      <Button
                        size="icon" className="h-7 w-7 rounded-full"
                        onClick={() => updateQty(l.product_id, +1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      €{lineGross.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeLine(l.product_id)}
                  className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}

        {cart.length > 0 && (
          <div className="pt-3">
            <label className="text-xs font-medium text-muted-foreground">
              Observações para esta encomenda
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: entregar até sexta..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        )}
      </div>

      <SheetFooter className="border-t p-4 flex-col gap-3 sm:flex-col">
        {cart.length > 0 && (
          <div className="w-full space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>€{totals.net.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA</span>
              <span>€{totals.vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1 border-t">
              <span>Total</span>
              <span>€{totals.gross.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex gap-2 w-full">
          {cart.length > 0 && (
            <Button variant="outline" onClick={onClear} className="shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 text-base font-semibold"
            disabled={cart.length === 0 || isSubmitting}
            onClick={onSubmit}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "A enviar..." : "Submeter encomenda"}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}
