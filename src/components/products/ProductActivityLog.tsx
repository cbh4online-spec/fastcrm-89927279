import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2, History, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ProductActivityLogProps {
  productId: string;
}

// Field labels for display
const fieldLabels: Record<string, string> = {
  name: "Nome",
  base_price: "Preço",
  direct_cost: "Custo Direto",
  operational_cost: "Custo Operacional",
  status: "Estado",
  category: "Categoria",
  product_type: "Tipo",
  billing_type: "Cobrança",
  store_published: "Loja Online",
  b2b_published: "Portal B2B",
  sku: "SKU",
  short_description: "Descrição",
  commercial_description: "Descrição Comercial",
  images: "Imagens",
  updated_at: "Última atualização",
};

const actionLabels: Record<string, string> = {
  INSERT: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Eliminado",
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (field === "base_price" || field === "direct_cost" || field === "operational_cost") {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(value));
  }
  if (field === "status") return value === "active" ? "Ativo" : "Arquivado";
  if (Array.isArray(value)) return `${value.length} item(s)`;
  return String(value);
}

export function ProductActivityLog({ productId }: ProductActivityLogProps) {
  const { currentWorkspace } = useWorkspace();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["product-activity-log", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("table_name", "products")
        .eq("record_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Sem histórico de alterações registado.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="relative pl-6 space-y-0">
        {/* Timeline line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

        {logs.map((log) => {
          const changedFields = (log.changed_fields || []) as string[];
          const oldData = (log.old_data || {}) as Record<string, unknown>;
          const newData = (log.new_data || {}) as Record<string, unknown>;
          // Filter out noise fields
          const meaningfulFields = changedFields.filter(f => f !== "updated_at" && f in fieldLabels);

          return (
            <div key={log.id} className="relative pb-4">
              {/* Timeline dot */}
              <div className={`absolute -left-3.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                log.action === "INSERT" ? "bg-green-500 border-green-300" :
                log.action === "DELETE" ? "bg-destructive border-destructive/50" :
                "bg-primary border-primary/50"
              }`} />

              <div className="bg-card border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={log.action === "INSERT" ? "default" : log.action === "DELETE" ? "destructive" : "secondary"} className="text-[10px]">
                    {actionLabels[log.action] || log.action}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: pt })}
                  </span>
                </div>

                {log.action === "INSERT" && (
                  <p className="text-xs text-muted-foreground mt-1">Produto criado no sistema</p>
                )}

                {log.action === "UPDATE" && meaningfulFields.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {meaningfulFields.map(field => (
                      <div key={field} className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-muted-foreground min-w-[80px]">
                          {fieldLabels[field] || field}
                        </span>
                        <span className="text-muted-foreground line-through">
                          {formatFieldValue(field, oldData[field])}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">
                          {formatFieldValue(field, newData[field])}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {log.action === "UPDATE" && meaningfulFields.length === 0 && changedFields.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {changedFields.length} campo{changedFields.length > 1 ? "s" : ""} atualizado{changedFields.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
