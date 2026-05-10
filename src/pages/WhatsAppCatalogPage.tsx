import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, Search, TrendingUp, Send, MessageCircle, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { SendProductByWhatsAppButton } from "@/components/whatsapp-pro/SendProductByWhatsAppButton";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ProductRow {
  id: string;
  name: string;
  base_price: number | null;
  currency: string | null;
  category: string | null;
  status: string;
  images: string[] | null;
  primary_image_index: number | null;
  short_description: string | null;
  sheet_slug: string | null;
  sheet_published: boolean | null;
}

interface ShareRow {
  id: string;
  product_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  status: string;
  sent_at: string;
  product?: { id: string; name: string; base_price: number | null } | null;
  contact?: { id: string; name: string | null; phone: string | null } | null;
}

function getPrimaryImage(p: ProductRow): string | null {
  const imgs = p.images ?? [];
  if (imgs.length === 0) return null;
  const idx = p.primary_image_index ?? 0;
  return imgs[idx] ?? imgs[0] ?? null;
}

function fmtPrice(value: number | null, currency: string | null): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency || "EUR",
    }).format(Number(value));
  } catch {
    return `${value} ${currency ?? "EUR"}`;
  }
}

export default function WhatsAppCatalogPage() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all__");

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["wa-catalog-products", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, base_price, currency, category, status, images, primary_image_index, short_description, sheet_slug, sheet_published",
        )
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: shares = [], isLoading: loadingShares } = useQuery({
    queryKey: ["wa-catalog-shares", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("whatsapp_product_shares" as never)
        .select(
          "id, product_id, contact_id, conversation_id, status, sent_at, product:products(id,name,base_price), contact:contacts(id,name,phone)",
        )
        .eq("workspace_id", currentWorkspace.id)
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ShareRow[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "__all__" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  const topProducts = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    shares.forEach((s) => {
      const id = s.product_id;
      const name = s.product?.name ?? "Produto removido";
      const cur = counts.get(id);
      if (cur) cur.count += 1;
      else counts.set(id, { id, name, count: 1 });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [shares]);

  const totalSent7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return shares.filter((s) => new Date(s.sent_at).getTime() >= cutoff).length;
  }, [shares]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" /> Catálogo WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              Envie produtos do catálogo diretamente por WhatsApp como cartão de produto.
            </p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Produtos ativos</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Enviados (7d)</p>
              <p className="text-2xl font-bold">{totalSent7d}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de envios</p>
              <p className="text-2xl font-bold">{shares.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-lg">Produtos</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Procurar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas as categorias</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>Sem produtos correspondentes.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filtered.map((p) => {
                      const img = getPrimaryImage(p);
                      return (
                        <div
                          key={p.id}
                          className="border rounded-lg p-3 flex gap-3 hover:border-primary/50 transition-colors"
                        >
                          <div className="w-16 h-16 rounded bg-[hsl(var(--muted))] overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground opacity-40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm truncate">{p.name}</p>
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                {fmtPrice(p.base_price, p.currency)}
                              </Badge>
                            </div>
                            {p.category && (
                              <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                            )}
                            {p.short_description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {p.short_description}
                              </p>
                            )}
                            <div className="mt-auto pt-2">
                              <SendProductByWhatsAppButton
                                productId={p.id}
                                productName={p.name}
                                productPrice={p.base_price ?? undefined}
                                productImageUrl={img}
                                label="Enviar"
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: top + recent */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Top partilhas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingShares ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : topProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Sem envios registados ainda.
                  </p>
                ) : (
                  <ol className="space-y-2 text-sm">
                    {topProducts.map((p, i) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] shrink-0">{i + 1}</Badge>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{p.count}</Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" /> Envios recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingShares ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : shares.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Sem partilhas recentes.
                  </p>
                ) : (
                  <ul className="divide-y text-sm">
                    {shares.slice(0, 8).map((s) => (
                      <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{s.product?.name ?? "Produto removido"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.contact?.name ?? s.contact?.phone ?? "—"} ·{" "}
                            {formatDistanceToNow(new Date(s.sent_at), { addSuffix: true, locale: pt })}
                          </p>
                        </div>
                        {s.conversation_id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-7 w-7"
                            onClick={() => navigate(`/dashboard/inbox?conversation=${s.conversation_id}`)}
                            title="Abrir conversa"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
