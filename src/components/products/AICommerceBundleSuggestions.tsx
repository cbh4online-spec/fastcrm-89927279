import { useState } from "react";
import { Sparkles, Package, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBundleSuggestions } from "@/hooks/useBundleSuggestions";
import type { BundleSuggestion } from "@/lib/ai-commerce/bundleBuilder";

const GOAL_BADGE: Record<BundleSuggestion["goal"], string> = {
  starter: "Kit inicial",
  solution: "Solução completa",
  accessories: "Complementos",
};

function euro(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function AICommerceBundleSuggestions({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  const { data: suggestions, isLoading } = useBundleSuggestions({ enabled: open });

  const createBundle = async (suggestion: BundleSuggestion) => {
    if (!currentWorkspace?.id) return;
    setCreatingKey(suggestion.key);
    try {
      const { data: bundle, error } = await supabase
        .from("product_bundles")
        .insert({
          workspace_id: currentWorkspace.id,
          name: suggestion.name,
          description: suggestion.description,
          discount_type: "percentage",
          discount_value: suggestion.discount_pct,
        } as any)
        .select()
        .single();
      if (error) throw error;

      const items = suggestion.items.map((i) => ({
        bundle_id: bundle.id,
        product_id: i.product_id,
        quantity: i.quantity,
      }));
      const { error: itemsError } = await supabase.from("product_bundle_items").insert(items as any);
      if (itemsError) throw itemsError;

      queryClient.invalidateQueries({ queryKey: ["product-bundles"] });
      toast.success("Bundle criado a partir da sugestão AI Commerce");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível criar o bundle");
    } finally {
      setCreatingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Sugerir bundles com AI Commerce
          </DialogTitle>
          <DialogDescription>
            Pacotes construídos apenas com produtos ativos, com stock e relações comerciais já
            aprovadas. Preços e custos são os reais do catálogo — nada é inventado.
          </DialogDescription>
        </DialogHeader>

        {brands.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Marca</span>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
        ) : !suggestions || suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Ainda não há pacotes viáveis. Defina acessórios, produtos compatíveis ou obrigatórios
              nas relações dos produtos e volte a tentar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <Card key={s.key}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        <Badge variant="secondary">{GOAL_BADGE[s.goal]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => createBundle(s)}
                      disabled={creatingKey === s.key}
                    >
                      {creatingKey === s.key ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Package className="h-4 w-4 mr-1" />
                      )}
                      Criar este bundle
                    </Button>
                  </div>

                  <ul className="space-y-1">
                    {s.items.map((i) => (
                      <li key={i.product_id} className="flex items-center justify-between text-sm">
                        <span className="truncate">
                          {i.role === "anchor" ? "• " : "＋ "}
                          {i.name}
                          {i.sku ? <span className="text-muted-foreground"> · {i.sku}</span> : null}
                        </span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {i.quantity} × {euro(i.unit_price)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
                    <span className="text-muted-foreground line-through">{euro(s.list_total)}</span>
                    <span className="font-semibold">{euro(s.bundle_total)}</span>
                    <Badge variant="default" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      -{s.discount_pct}% · poupa {euro(s.savings)}
                    </Badge>
                    {s.margin_pct != null && (
                      <Badge variant="outline" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Margem {s.margin_pct.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
