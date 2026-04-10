import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, Plus, Trash2, Package, RefreshCw, Loader2 } from "lucide-react";

interface BundleRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  module_ids: string[];
  original_price: number;
  bundle_price: number;
  discount_percent: number;
  is_active: boolean;
  is_featured: boolean;
}

interface ModuleRef {
  id: string;
  name: string;
  slug: string;
  price_eur: number | null;
}

export function BundlesTab() {
  const queryClient = useQueryClient();
  const [editBundle, setEditBundle] = useState<BundleRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", bundle_price: 0, is_active: true, is_featured: false });

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["admin-module-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_bundles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as BundleRow[];
    },
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ["admin-modules-ref"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_modules")
        .select("id, name, slug, price_eur")
        .order("name");
      if (error) throw error;
      return data as ModuleRef[];
    },
  });

  const updateBundle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BundleRow> & { id: string }) => {
      const { error } = await supabase.from("module_bundles").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-module-bundles"] });
      toast.success("Bundle atualizado");
      setEditBundle(null);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const createBundle = useMutation({
    mutationFn: async (input: typeof form) => {
      const { error } = await supabase.from("module_bundles").insert({
        ...input,
        module_ids: [],
        original_price: input.bundle_price,
        discount_percent: 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-module-bundles"] });
      toast.success("Bundle criado");
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", bundle_price: 0, is_active: true, is_featured: false });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const deleteBundle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("module_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-module-bundles"] });
      toast.success("Bundle removido");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const getModuleName = (id: string) => allModules.find((m) => m.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{bundles.length} bundles</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Bundle
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-module-bundles"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((bundle) => (
            <Card key={bundle.id} className={!bundle.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {bundle.is_featured && <Badge className="text-[10px]">Destaque</Badge>}
                    {!bundle.is_active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditBundle(bundle)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                      if (confirm("Remover este bundle?")) deleteBundle.mutate(bundle.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-base">{bundle.name}</CardTitle>
                {bundle.description && <CardDescription className="text-xs">{bundle.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    {bundle.original_price > bundle.bundle_price && (
                      <span className="text-sm text-muted-foreground line-through">{bundle.original_price}€</span>
                    )}
                    <span className="text-2xl font-bold text-primary">{bundle.bundle_price}€</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                    {bundle.discount_percent > 0 && (
                      <Badge variant="secondary" className="text-[10px]">-{bundle.discount_percent}%</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Módulos incluídos:</p>
                    <div className="flex flex-wrap gap-1">
                      {bundle.module_ids?.map((id) => (
                        <Badge key={id} variant="outline" className="text-[10px]">{getModuleName(id)}</Badge>
                      ))}
                      {(!bundle.module_ids || bundle.module_ids.length === 0) && (
                        <span className="text-xs text-muted-foreground">Nenhum módulo</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editBundle} onOpenChange={() => setEditBundle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Bundle</DialogTitle>
          </DialogHeader>
          {editBundle && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={editBundle.name} onChange={(e) => setEditBundle({ ...editBundle, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço Original (€)</Label>
                  <Input type="number" value={editBundle.original_price} onChange={(e) => setEditBundle({ ...editBundle, original_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Preço Bundle (€)</Label>
                  <Input type="number" value={editBundle.bundle_price} onChange={(e) => setEditBundle({ ...editBundle, bundle_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>Desconto (%)</Label>
                <Input type="number" value={editBundle.discount_percent} onChange={(e) => setEditBundle({ ...editBundle, discount_percent: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={editBundle.is_active} onCheckedChange={(v) => setEditBundle({ ...editBundle, is_active: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Destaque</Label>
                <Switch checked={editBundle.is_featured} onCheckedChange={(v) => setEditBundle({ ...editBundle, is_featured: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBundle(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!editBundle) return;
              updateBundle.mutate({
                id: editBundle.id,
                name: editBundle.name,
                original_price: editBundle.original_price,
                bundle_price: editBundle.bundle_price,
                discount_percent: editBundle.discount_percent,
                is_active: editBundle.is_active,
                is_featured: editBundle.is_featured,
              });
            }}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Bundle</DialogTitle>
            <DialogDescription>Criar um novo pack de módulos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: B2B Revenue Pack" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s/g, "-") }))} placeholder="Ex: b2b-revenue-pack" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Preço (€/mês)</Label>
              <Input type="number" value={form.bundle_price} onChange={(e) => setForm((p) => ({ ...p, bundle_price: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createBundle.mutate(form)} disabled={!form.name || !form.slug || createBundle.isPending}>
              {createBundle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
