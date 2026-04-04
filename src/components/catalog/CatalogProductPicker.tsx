import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";

interface Props {
  workspaceId: string;
  excludeProductIds: string[];
  onAdd: (productId: string) => void;
}

export function CatalogProductPicker({ workspaceId, excludeProductIds, onAdd }: Props) {
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["catalog-products-picker", workspaceId, search],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, price, images, currency")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name")
        .limit(50);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const filtered = products?.filter((p) => !excludeProductIds.includes(p.id)) || [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <ScrollArea className="h-64">
        <div className="space-y-1">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              {p.images?.[0] && (
                <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.NumberFormat("pt-PT", { style: "currency", currency: p.currency || "EUR" }).format(p.price)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onAdd(p.id)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto disponível</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
