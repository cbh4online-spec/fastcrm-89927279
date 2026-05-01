import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Loader2, History, ArrowRight, User as UserIcon, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProductActivityLogProps {
  productId: string;
}

// Field labels for display — keep aligned with editable fields in the products module
const fieldLabels: Record<string, string> = {
  name: "Nome",
  base_price: "Preço (PVP)",
  direct_cost: "Custo Direto",
  operational_cost: "Custo Operacional",
  status: "Estado",
  category: "Categoria",
  product_type: "Tipo",
  billing_type: "Cobrança",
  billing_frequency: "Frequência",
  store_published: "Loja Online",
  b2b_published: "Portal B2B",
  sku: "SKU",
  short_description: "Descrição Curta",
  commercial_description: "Descrição Comercial",
  images: "Imagens",
  total_units: "Unidades",
  unit_duration: "Duração",
  validity_days: "Validade (dias)",
  tax_rate_estimate_pct: "Taxa IVA (%)",
  commission_default: "Comissão (%)",
  delivery_mode: "Modo Entrega",
  currency: "Moeda",
  sales_playbook: "Vendas & Pós-venda",
};

const PRICING_FIELDS = new Set(["base_price", "direct_cost", "operational_cost"]);

const actionLabels: Record<string, string> = {
  INSERT: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Eliminado",
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (PRICING_FIELDS.has(field)) {
    const n = Number(value);
    if (!isNaN(n)) return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
  }
  if (field === "tax_rate_estimate_pct" || field === "commission_default") {
    return `${value}%`;
  }
  if (field === "status") return value === "active" ? "Ativo" : "Arquivado";
  if (field === "unit_duration") return `${value} min`;
  if (field === "validity_days") return `${value} dias`;
  if (field === "sales_playbook" && typeof value === "object") return "Playbook atualizado";
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === "object") return JSON.stringify(value).slice(0, 80);
  return String(value);
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function priceDelta(field: string, oldVal: unknown, newVal: unknown): { pct: number; sign: "up" | "down" } | null {
  if (!PRICING_FIELDS.has(field)) return null;
  const o = Number(oldVal);
  const n = Number(newVal);
  if (!isFinite(o) || !isFinite(n) || o === 0) return null;
  const pct = ((n - o) / o) * 100;
  if (Math.abs(pct) < 0.01) return null;
  return { pct: Math.abs(pct), sign: pct >= 0 ? "up" : "down" };
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
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });

  // Fetch profiles for all unique user_ids in the logs
  const userIds = Array.from(new Set((logs || []).map(l => l.user_id).filter(Boolean) as string[]));
  const { data: profiles } = useQuery({
    queryKey: ["product-activity-profiles", productId, userIds.join(",")],
    queryFn: async () => {
      if (!userIds.length) return [] as Array<{ user_id: string; full_name: string | null; email: string | null; avatar_url: string | null }>;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);
      if (error) return [];
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

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
    <ScrollArea className="h-[500px]">
      <div className="relative pl-6 space-y-0">
        {/* Timeline line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

        {logs.map((log) => {
          const changedFields = (log.changed_fields || []) as string[];
          const oldData = (log.old_data || {}) as Record<string, unknown>;
          const newData = (log.new_data || {}) as Record<string, unknown>;
          // Filter out noise fields (updated_at) but keep all others — even unmapped ones
          const meaningfulFields = changedFields.filter(f => f !== "updated_at");
          const profile = log.user_id ? profileMap.get(log.user_id) : null;
          const userName = profile?.full_name || profile?.email || (log.user_id ? "Utilizador" : "Sistema");
          const dateObj = new Date(log.created_at);
          const isInline = log.action === "UPDATE" && meaningfulFields.length === 1 && PRICING_FIELDS.has(meaningfulFields[0]);

          return (
            <div key={log.id} className="relative pb-4">
              {/* Timeline dot */}
              <div className={`absolute -left-3.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                log.action === "INSERT" ? "bg-green-500 border-green-300" :
                log.action === "DELETE" ? "bg-destructive border-destructive/50" :
                "bg-primary border-primary/50"
              }`} />

              <div className="bg-card border rounded-lg p-3 space-y-2">
                {/* Header: action + timestamp */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={log.action === "INSERT" ? "default" : log.action === "DELETE" ? "destructive" : "secondary"} className="text-[10px]">
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    {isInline && (
                      <Badge variant="outline" className="text-[10px]">Edição inline</Badge>
                    )}
                    {log.action === "UPDATE" && meaningfulFields.length > 1 && (
                      <Badge variant="outline" className="text-[10px]">{meaningfulFields.length} campos</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(dateObj, "dd MMM yyyy 'às' HH:mm:ss", { locale: pt })}</span>
                  </div>
                </div>

                {/* Author row */}
                <div className="flex items-center gap-2 text-xs">
                  <Avatar className="h-5 w-5">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={userName} />}
                    <AvatarFallback className="text-[9px]">
                      {profile ? getInitials(profile.full_name, profile.email) : <UserIcon className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{userName}</span>
                  {profile?.email && profile.full_name && (
                    <span className="text-muted-foreground">· {profile.email}</span>
                  )}
                </div>

                {log.action === "INSERT" && (
                  <p className="text-xs text-muted-foreground">Produto criado no sistema</p>
                )}

                {log.action === "DELETE" && (
                  <p className="text-xs text-destructive">Produto eliminado</p>
                )}

                {log.action === "UPDATE" && meaningfulFields.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t">
                    {meaningfulFields.map(field => {
                      const label = fieldLabels[field] || field;
                      const delta = priceDelta(field, oldData[field], newData[field]);
                      return (
                        <div key={field} className="flex items-start gap-2 text-xs">
                          <span className="font-medium text-muted-foreground min-w-[110px] flex-shrink-0">
                            {label}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-muted-foreground line-through break-all">
                              {formatFieldValue(field, oldData[field])}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium break-all">
                              {formatFieldValue(field, newData[field])}
                            </span>
                            {delta && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] ${delta.sign === "up" ? "text-emerald-600 border-emerald-300" : "text-destructive border-destructive/40"}`}
                              >
                                {delta.sign === "up" ? "▲" : "▼"} {delta.pct.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {log.action === "UPDATE" && meaningfulFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">Atualização de metadados</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
