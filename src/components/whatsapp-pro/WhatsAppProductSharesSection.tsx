import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, ArrowUpRight, PackageSearch } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  /** Filtra por produto OU contacto. Pelo menos um deve ser fornecido. */
  productId?: string;
  contactId?: string;
  title?: string;
  emptyMessage?: string;
  limit?: number;
}

interface ShareRow {
  id: string;
  product_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  status: string;
  sent_at: string;
  agent_id: string | null;
  metadata: Record<string, unknown> | null;
  product?: { id: string; name: string; base_price: number | null } | null;
  contact?: { id: string; name: string | null; phone: string | null } | null;
}

export function WhatsAppProductSharesSection({
  productId,
  contactId,
  title,
  emptyMessage,
  limit = 20,
}: Props) {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-product-shares-section", currentWorkspace?.id, productId, contactId, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("whatsapp_product_shares" as never)
        .select(
          "id, product_id, contact_id, conversation_id, status, sent_at, agent_id, metadata, product:products(id,name,base_price), contact:contacts(id,name,phone)",
        )
        .eq("workspace_id", currentWorkspace.id)
        .order("sent_at", { ascending: false })
        .limit(limit);
      if (productId) q = q.eq("product_id", productId);
      if (contactId) q = q.eq("contact_id", contactId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ShareRow[];
    },
    enabled: !!currentWorkspace && (!!productId || !!contactId),
  });

  const heading = title ?? (productId ? "Envios por WhatsApp" : "Produtos enviados por WhatsApp");
  const empty =
    emptyMessage ??
    (productId
      ? "Este produto ainda não foi partilhado por WhatsApp."
      : "Este contacto ainda não recebeu produtos por WhatsApp.");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <PackageSearch className="h-4 w-4 text-emerald-600" />
          {heading}
        </h3>
        {data && data.length > 0 && (
          <Badge variant="outline" className="text-[10px]">{data.length}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {data.map((s) => (
            <li key={s.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {productId ? (s.contact?.name ?? "Sem contacto") : (s.product?.name ?? "Produto removido")}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge
                    variant={s.status === "sent" ? "default" : "secondary"}
                    className={
                      s.status === "sent"
                        ? "bg-emerald-500 hover:bg-emerald-600 text-[10px]"
                        : "text-[10px]"
                    }
                  >
                    {s.status}
                  </Badge>
                  <span>{formatDistanceToNow(new Date(s.sent_at), { addSuffix: true, locale: pt })}</span>
                  {productId && s.contact?.phone && <span className="truncate">· {s.contact.phone}</span>}
                </div>
              </div>
              {s.conversation_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 shrink-0"
                  onClick={() => navigate(`/dashboard/inbox?conversation=${s.conversation_id}`)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Abrir
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
