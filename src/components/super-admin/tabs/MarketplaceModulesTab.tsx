import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Edit, Save, X, RefreshCw, Package } from "lucide-react";

interface ModuleRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_eur: number | null;
  pricing_model: string | null;
  min_plan: string | null;
  status: string;
  is_featured: boolean | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "Comercial",
  marketing: "Marketing",
  ai: "Inteligência Artificial",
  commerce: "Commerce",
  operations: "Operações",
  finance: "Finanças",
  education: "Educação",
  community: "Comunidade",
  integrations: "Integrações",
  security: "Segurança",
};

const PRICING_MODELS = [
  { value: "free", label: "Gratuito" },
  { value: "monthly", label: "Mensal" },
  { value: "usage_based", label: "Uso" },
  { value: "credits", label: "Créditos" },
];

const PLANS = [
  { value: "free", label: "Free" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "agency", label: "Agency" },
];

export function MarketplaceModulesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ price_eur: number; pricing_model: string; min_plan: string }>({
    price_eur: 0, pricing_model: "free", min_plan: "free",
  });
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["admin-marketplace-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_modules")
        .select("id, name, slug, category, price_eur, pricing_model, min_plan, status, is_featured")
        .order("category")
        .order("name");
      if (error) throw error;
      return data as ModuleRow[];
    },
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; price_eur: number; pricing_model: string; min_plan: string }) => {
      const { error } = await supabase
        .from("marketplace_modules")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-modules"] });
      toast.success("Módulo atualizado");
      setEditingId(null);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const startEdit = (mod: ModuleRow) => {
    setEditValues({
      price_eur: mod.price_eur ?? 0,
      pricing_model: mod.pricing_model || "free",
      min_plan: mod.min_plan || "free",
    });
    setEditingId(mod.id);
  };

  const categories = [...new Set(modules.map((m) => m.category))].sort();
  const filtered = filterCategory === "all" ? modules : modules.filter((m) => m.category === filterCategory);

  // Group by category
  const grouped = filtered.reduce<Record<string, ModuleRow[]>>((acc, m) => {
    const cat = m.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filtered.length} módulos</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-marketplace-modules"] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        Object.entries(grouped).map(([category, mods]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                {CATEGORY_LABELS[category] || category}
                <Badge variant="outline" className="ml-2">{mods.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Preço (€)</TableHead>
                    <TableHead className="text-center">Modelo</TableHead>
                    <TableHead className="text-center">Plano Mín.</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mods.map((mod) => {
                    const isEditing = editingId === mod.id;
                    return (
                      <TableRow key={mod.id}>
                        <TableCell className="font-medium">
                          {mod.name}
                          {mod.is_featured && <Badge variant="secondary" className="ml-2 text-[10px]">Destaque</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editValues.price_eur}
                              onChange={(e) => setEditValues((p) => ({ ...p, price_eur: parseFloat(e.target.value) || 0 }))}
                              className="w-20 h-8 text-xs text-center mx-auto"
                            />
                          ) : (
                            <span className="font-mono">{mod.price_eur ?? 0}€</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Select value={editValues.pricing_model} onValueChange={(v) => setEditValues((p) => ({ ...p, pricing_model: v }))}>
                              <SelectTrigger className="w-28 h-8 text-xs mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRICING_MODELS.map((pm) => (
                                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {PRICING_MODELS.find((p) => p.value === mod.pricing_model)?.label || mod.pricing_model || "free"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Select value={editValues.min_plan} onValueChange={(v) => setEditValues((p) => ({ ...p, min_plan: v }))}>
                              <SelectTrigger className="w-24 h-8 text-xs mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PLANS.map((pl) => (
                                  <SelectItem key={pl.value} value={pl.value}>{pl.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] capitalize">{mod.min_plan || "free"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={mod.status === "published" ? "default" : "outline"} className="text-[10px]">
                            {mod.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateModule.mutate({ id: mod.id, ...editValues })}>
                                <Save className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(mod)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
