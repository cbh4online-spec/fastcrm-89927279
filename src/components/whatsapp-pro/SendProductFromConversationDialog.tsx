import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { SendProductByWhatsAppDialog } from "./SendProductByWhatsAppDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  contactId?: string | null;
  contactPhone?: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  base_price: number | null;
  category: string | null;
  images: string[] | null;
  sheet_slug: string | null;
}

/**
 * Modal para escolher um produto a enviar a partir da conversa do Inbox.
 * Após selecionar, abre o SendProductByWhatsAppDialog com pré-preenchimento.
 */
export function SendProductFromConversationDialog({
  open,
  onOpenChange,
  conversationId,
  contactId,
  contactPhone,
}: Props) {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<ProductRow | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["product-picker-whatsapp", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("products")
        .select("id, name, base_price, category, images, sheet_slug")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (search.trim().length > 1) {
        q = q.ilike("name", `%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    enabled: open && !!currentWorkspace,
  });

  if (picked) {
    return (
      <SendProductByWhatsAppDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setPicked(null);
            onOpenChange(false);
          }
        }}
        productId={picked.id}
        productName={picked.name}
        productPrice={picked.base_price}
        productImageUrl={picked.images?.[0] ?? null}
        productLink={currentWorkspace?.slug ? `/store/${currentWorkspace.slug}/product/${picked.id}` : null}
        prefillContactId={contactId ?? null}
        prefillConversationId={conversationId}
        prefillPhone={contactPhone ?? null}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Enviar produto</DialogTitle>
          <DialogDescription>Escolha um produto para partilhar nesta conversa.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produto"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1 border rounded-md min-h-[260px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground p-8">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="divide-y">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPicked(p)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/40 transition flex items-center gap-3"
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {typeof p.base_price === "number" && (
                        <span className="text-emerald-600 font-semibold">{p.base_price.toFixed(2)} €</span>
                      )}
                      {p.category && <span className="truncate">· {p.category}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
