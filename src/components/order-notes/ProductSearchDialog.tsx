import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Package } from "lucide-react";

interface ProductSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: {
    id: string;
    name: string;
    sku: string | null;
    image_url: string | null;
    price: number;
  }) => void;
}

export function ProductSearchDialog({ open, onClose, onSelect }: ProductSearchDialogProps) {
  const [search, setSearch] = useState("");
  const { currentWorkspace } = useWorkspace();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-search", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("products")
        .select("id, name, sku, images, primary_image_index, base_price")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("name")
        .limit(20);

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p) => {
        const imgIdx = p.primary_image_index ?? 0;
        const imageUrl = p.images && p.images.length > 0 ? p.images[imgIdx] || p.images[0] : null;
        return { id: p.id, name: p.name, sku: p.sku, image_url: imageUrl, base_price: p.base_price };
      });
    },
    enabled: open && !!currentWorkspace?.id,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pesquisar Produto</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">A carregar...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer group"
                onClick={() => {
                  onSelect({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    image_url: p.image_url,
                    price: p.base_price || 0,
                  });
                  onClose();
                  setSearch("");
                }}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">€{(p.base_price || 0).toFixed(2)}</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
