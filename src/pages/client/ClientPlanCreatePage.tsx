import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useSubscriptionPlans, CADENCE_LABELS } from "@/hooks/client-portal/useSubscriptionPlans";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SelectedProduct {
  product_id: string;
  name: string;
  base_price: number;
  qty: number;
}

export default function ClientPlanCreatePage() {
  const navigate = useNavigate();
  const { clientUser } = useClientAuth();
  const { createPlan, creating } = useSubscriptionPlans();
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [approvalMode, setApprovalMode] = useState("approval_required");
  const [maxCycleValue, setMaxCycleValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-plan", clientUser?.workspace_id],
    queryFn: async () => {
      if (!clientUser?.workspace_id) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, sku")
        .eq("workspace_id", clientUser.workspace_id)
        .eq("is_active", true)
        .order("name");
      return (data || []) as { id: string; name: string; base_price: number; sku: string | null }[];
    },
    enabled: !!clientUser?.workspace_id,
  });

  const addProduct = (product: any) => {
    if (selectedProducts.find((p) => p.product_id === product.id)) return;
    setSelectedProducts((prev) => [...prev, { product_id: product.id, name: product.name, base_price: product.base_price, qty: 1 }]);
  };

  const updateQty = (productId: string, delta: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, qty: Math.max(1, p.qty + delta) } : p))
    );
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.product_id !== productId));
  };

  const cycleTotal = selectedProducts.reduce((s, p) => s + p.base_price * p.qty, 0);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Nome do plano obrigatório"); return; }
    if (selectedProducts.length === 0) { toast.error("Adicione pelo menos 1 produto"); return; }
    try {
      await createPlan({
        name,
        cadence,
        approval_mode: approvalMode,
        max_cycle_value: maxCycleValue ? parseFloat(maxCycleValue) : undefined,
        items: selectedProducts.map((p) => ({ product_id: p.product_id, qty: p.qty })),
      });
      navigate("/client/plans");
    } catch {}
  };

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/client/plans")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold">Criar Plano de Manutenção</h1>

        {/* Step 1: Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Detalhes do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Plano</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Manutenção Capilar Mensal" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cadência</Label>
                <Select value={cadence} onValueChange={setCadence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CADENCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modo de Aprovação</Label>
                <Select value={approvalMode} onValueChange={setApprovalMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="approval_required">Aprovação Obrigatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Limite Máximo por Ciclo (€, opcional)</Label>
              <Input type="number" value={maxCycleValue} onChange={(e) => setMaxCycleValue(e.target.value)} placeholder="Sem limite" />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Produtos do Plano</CardTitle>
            <CardDescription>Selecione os produtos e quantidades para cada ciclo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add product */}
            <Select onValueChange={(id) => {
              const p = products.find((pr: any) => pr.id === id);
              if (p) addProduct(p);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar produto..." />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter((p: any) => !selectedProducts.find((sp) => sp.product_id === p.id))
                  .map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.base_price?.toFixed(2)}€</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selectedProducts.map((sp) => (
              <div key={sp.product_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{sp.name}</p>
                  <p className="text-xs text-muted-foreground">{sp.base_price.toFixed(2)}€/un</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(sp.product_id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{sp.qty}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(sp.product_id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeProduct(sp.product_id)} className="text-destructive text-xs ml-2">
                    Remover
                  </Button>
                </div>
              </div>
            ))}

            {selectedProducts.length > 0 && (
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total por ciclo (s/IVA)</span>
                <span>{cycleTotal.toFixed(2)}€</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Criar Plano
        </Button>
      </div>
    </ClientLayout>
  );
}
