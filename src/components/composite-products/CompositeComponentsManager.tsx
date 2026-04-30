import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Package, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompositeComponents, useAddComponent, useUpdateComponent, useRemoveComponent, useCompositeGroups } from "@/hooks/useCompositeProducts";
import { formatMoneyEur } from "@/lib/money";

interface Props {
  kitId: string;
}

export function CompositeComponentsManager({ kitId }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { data: components = [], isLoading } = useCompositeComponents(kitId);
  const { data: groups = [] } = useCompositeGroups(kitId);
  const addComp = useAddComponent();
  const updComp = useUpdateComponent();
  const remComp = useRemoveComponent();
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products-picker", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("products")
        .select("id, name, sku, base_price, direct_cost, avg_cost")
        .eq("workspace_id", currentWorkspace.id)
        .limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: pickerOpen,
  });

  const groupOptions = useMemo(() => [{ id: "", name: "— Sem grupo —" }, ...groups.map((g) => ({ id: g.id, name: g.name }))], [groups]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Componentes ({components.length})</CardTitle>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Adicionar produto
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Procurar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-auto">
              {products.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">Sem resultados</p>
              ) : (
                products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left p-2 hover:bg-muted/50 border-b last:border-0"
                    onClick={async () => {
                      await addComp.mutateAsync({ kit_id: kitId, product_id: p.id, quantity: 1 });
                      setSearch("");
                      setPickerOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku || "—"} • {formatMoneyEur(Number(p.base_price))}</p>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">A carregar...</p>
        ) : components.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Sem componentes ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-24">Qtd.</TableHead>
                <TableHead className="hidden md:table-cell">Grupo</TableHead>
                <TableHead className="hidden md:table-cell">Obrig.</TableHead>
                <TableHead className="hidden md:table-cell">Substitui</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((c) => {
                const cost = Number(c.unit_cost_snapshot ?? c.product?.direct_cost ?? c.product?.avg_cost ?? 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.product?.name ?? c.product_name_suggested ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.product?.sku || ""}</p>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        defaultValue={c.quantity}
                        className="h-8 w-20"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v && v !== c.quantity) updComp.mutate({ id: c.id, kit_id: kitId, quantity: v });
                        }}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <select
                        className="h-8 text-xs border rounded-md px-2 bg-background"
                        value={c.group_id ?? ""}
                        onChange={(e) => updComp.mutate({ id: c.id, kit_id: kitId, group_id: e.target.value || null })}
                      >
                        {groupOptions.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Switch
                        checked={!!c.is_required}
                        onCheckedChange={(v) => updComp.mutate({ id: c.id, kit_id: kitId, is_required: v })}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Switch
                        checked={!!c.allows_substitution}
                        onCheckedChange={(v) => updComp.mutate({ id: c.id, kit_id: kitId, allows_substitution: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <Badge variant="outline">{formatMoneyEur(cost * c.quantity)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => remComp.mutate({ id: c.id, kit_id: kitId })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
