import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Users,
  Building,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Search,
} from "lucide-react";
import { usePricingOptimizer } from "@/hooks/usePricingOptimizer";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface AICustomerPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  customerName?: string;
  customerType?: "contact" | "company";
  products?: { id: string; name: string; basePrice: number; cost?: number; category?: string }[];
  onCreatePriceTable?: (result: any) => void;
}

const segmentLabels: Record<string, string> = {
  vip: "VIP",
  partner: "Parceiro",
  reseller: "Revendedor",
  end_customer: "Cliente Final",
  wholesale: "Grossista",
};

const riskIcons: Record<string, React.ReactNode> = {
  low: <ShieldCheck className="h-4 w-4 text-green-600" />,
  medium: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  high: <ShieldAlert className="h-4 w-4 text-red-600" />,
};

export function AICustomerPricingDialog({
  open,
  onOpenChange,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  customerType = "contact",
  products: initialProducts,
  onCreatePriceTable,
}: AICustomerPricingDialogProps) {
  const { suggestCustomerPricing } = usePricingOptimizer();
  const { data: allProducts } = useProducts();
  const { currentWorkspace } = useWorkspace();
  const [result, setResult] = useState<any>(null);
  
  // Customer selection state
  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [customerName, setCustomerName] = useState(initialCustomerName || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string; type: "contact" | "company" }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Use provided products or all products
  const products = initialProducts || allProducts?.map(p => ({
    id: p.id,
    name: p.name,
    basePrice: p.base_price,
    cost: p.direct_cost ?? undefined,
    category: p.category ?? undefined,
  }));

  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
      setCustomerName(initialCustomerName || "");
    }
  }, [initialCustomerId, initialCustomerName]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentWorkspace?.id) return;
    
    setIsSearching(true);
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, name")
          .eq("workspace_id", currentWorkspace.id)
          .ilike("name", `%${searchQuery}%`)
          .limit(5),
        supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", currentWorkspace.id)
          .ilike("name", `%${searchQuery}%`)
          .limit(5),
      ]);

      const results: { id: string; name: string; type: "contact" | "company" }[] = [];
      if (contactsRes.data) {
        results.push(...contactsRes.data.map(c => ({ ...c, type: "contact" as const })));
      }
      if (companiesRes.data) {
        results.push(...companiesRes.data.map(c => ({ ...c, type: "company" as const })));
      }
      setCustomers(results);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (customer: { id: string; name: string; type: "contact" | "company" }) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setSearchQuery("");
    setCustomers([]);
  };

  const handleAnalyze = async () => {
    if (!customerId) {
      toast.error("Selecione um cliente para analisar");
      return;
    }

    try {
      const data = await suggestCustomerPricing.mutateAsync({
        customerId,
        products,
      });
      setResult(data);
    } catch (error) {
      toast.error("Erro ao analisar cliente");
    }
  };

  const handleCreateTable = () => {
    if (onCreatePriceTable && result) {
      onCreatePriceTable(result);
      onOpenChange(false);
      toast.success("Tabela de preços criada para o cliente");
    } else {
      toast.success("Análise concluída - pode criar tabela manualmente");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setCustomerId(initialCustomerId || "");
    setCustomerName(initialCustomerName || "");
    setSearchQuery("");
    setCustomers([]);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Preços Personalizados com IA
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {customerType === "contact" ? (
              <Users className="h-4 w-4" />
            ) : (
              <Building className="h-4 w-4" />
            )}
            {customerName || "Cliente"}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6">
            {/* Customer Selection */}
            {!initialCustomerId && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Selecionar Cliente</label>
                {customerId ? (
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{customerName}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setCustomerId(""); setCustomerName(""); }}>
                      Alterar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Pesquisar cliente ou empresa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {customers.length > 0 && (
                      <div className="border rounded-lg divide-y">
                        {customers.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 hover:bg-muted/50 cursor-pointer flex items-center gap-2"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            {c.type === "contact" ? <Users className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                            <span>{c.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {c.type === "contact" ? "Contacto" : "Empresa"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Card className="p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Análise Inteligente de Preços</p>
                  <p className="text-muted-foreground">
                    A IA irá analisar o perfil do cliente, histórico de compras, 
                    segmento e potencial para sugerir uma estratégia de preços 
                    personalizada.
                  </p>
                </div>
              </div>
            </Card>

            {products && products.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Produtos a analisar ({products.length})</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {products.slice(0, 5).map((p) => (
                    <div key={p.id} className="text-sm flex justify-between p-2 bg-muted/50 rounded">
                      <span className="truncate">{p.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(p.basePrice)}</span>
                    </div>
                  ))}
                  {products.length > 5 && (
                    <div className="text-sm text-muted-foreground text-center">
                      +{products.length - 5} mais produtos
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="p-4 border-primary/20">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Segmento Recomendado</div>
                  <Badge variant="default" className="mt-1">
                    {segmentLabels[result.recommendedSegment] || result.recommendedSegment}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Desconto Sugerido</div>
                  <div className="font-medium text-lg">
                    {result.suggestedDiscountRange?.min}% - {result.suggestedDiscountRange?.max}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Risk Level */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                {riskIcons[result.riskLevel]}
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Nível de Risco: {result.riskLevel === "low" ? "Baixo" : result.riskLevel === "medium" ? "Médio" : "Alto"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.reasoning}
                  </div>
                </div>
              </div>
            </Card>

            {/* Pricing Strategy */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Estratégia de Preços</div>
                  <div className="text-sm text-muted-foreground">{result.pricingStrategy}</div>
                </div>
              </div>
            </Card>

            {/* Upsell Opportunities */}
            {result.upsellOpportunities?.length > 0 && (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Oportunidades de Upsell</div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                      {result.upsellOpportunities.map((opp: string, i: number) => (
                        <li key={i}>{opp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            {/* Product Suggestions */}
            {result.productSuggestions?.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Preços Sugeridos por Produto</div>
                {result.productSuggestions.map((ps: any, i: number) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{ps.productName}</div>
                        <div className="text-xs text-muted-foreground">{ps.justification}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground line-through">
                          {formatCurrency(ps.originalPrice)}
                        </div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(ps.suggestedPrice)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          -{ps.discountPercent}%
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleAnalyze} disabled={suggestCustomerPricing.isPending || !customerId}>
                {suggestCustomerPricing.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A analisar cliente...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar e Sugerir
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResult(null)}>
                Nova Análise
              </Button>
              <Button onClick={handleCreateTable}>
                Criar Tabela de Preços
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
