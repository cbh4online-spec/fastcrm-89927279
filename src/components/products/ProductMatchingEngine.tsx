import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Plus,
  X,
  Sparkles,
  Check,
  AlertTriangle,
  Trophy,
  GitCompare,
  Loader2,
  Search,
} from "lucide-react";
import { Product } from "@/types/product";
import { useProducts } from "@/hooks/useProducts";
import {
  useClientRequirements,
  useCreateRequirement,
  ClientRequirement,
} from "@/hooks/useClientRequirements";

interface ProductMatchingEngineProps {
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
  onAddToProposal?: (product: Product) => void;
  onCompare?: (products: Product[]) => void;
  currency?: string;
}

interface RequirementField {
  key: string;
  label: string;
  value: string;
  operator: "min" | "max" | "exact" | "contains";
}

interface ProductMatch {
  product: Product;
  score: number;
  matches: {
    key: string;
    label: string;
    required: string;
    actual: string | undefined;
    status: "exceeds" | "meets" | "below" | "missing";
  }[];
}

const COMMON_REQUIREMENTS = [
  { key: "resolution", label: "Resolução", operator: "min" as const },
  { key: "nightVision", label: "Visão Noturna (m)", operator: "min" as const },
  { key: "protection", label: "Proteção IP", operator: "min" as const },
  { key: "storage", label: "Armazenamento", operator: "min" as const },
  { key: "connectivity", label: "Conectividade", operator: "contains" as const },
  { key: "budget", label: "Orçamento Máximo", operator: "max" as const },
];

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function extractNumericValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

function calculateMatch(
  product: Product,
  requirements: RequirementField[]
): ProductMatch {
  const matches: ProductMatch["matches"] = [];
  let totalScore = 0;
  let totalWeight = 0;

  requirements.forEach((req) => {
    if (!req.value) return;

    const weight = 1;
    totalWeight += weight;

    // Handle budget separately
    if (req.key === "budget") {
      const budget = parseFloat(req.value);
      const price = product.base_price || 0;

      if (price <= budget) {
        totalScore += weight;
        matches.push({
          key: req.key,
          label: req.label,
          required: `≤ ${req.value}`,
          actual: price.toString(),
          status: price < budget * 0.8 ? "exceeds" : "meets",
        });
      } else {
        matches.push({
          key: req.key,
          label: req.label,
          required: `≤ ${req.value}`,
          actual: price.toString(),
          status: "below",
        });
      }
      return;
    }

    const actualValue = product.specifications?.[req.key] as string | undefined;

    if (!actualValue) {
      matches.push({
        key: req.key,
        label: req.label,
        required: req.value,
        actual: undefined,
        status: "missing",
      });
      return;
    }

    const requiredNum = extractNumericValue(req.value);
    const actualNum = extractNumericValue(actualValue);

    if (req.operator === "contains") {
      const contains = actualValue
        .toLowerCase()
        .includes(req.value.toLowerCase());
      if (contains) {
        totalScore += weight;
        matches.push({
          key: req.key,
          label: req.label,
          required: req.value,
          actual: actualValue,
          status: "meets",
        });
      } else {
        matches.push({
          key: req.key,
          label: req.label,
          required: req.value,
          actual: actualValue,
          status: "below",
        });
      }
    } else if (requiredNum !== null && actualNum !== null) {
      if (req.operator === "min") {
        if (actualNum >= requiredNum) {
          totalScore += weight;
          matches.push({
            key: req.key,
            label: req.label,
            required: req.value,
            actual: actualValue,
            status: actualNum > requiredNum ? "exceeds" : "meets",
          });
        } else {
          matches.push({
            key: req.key,
            label: req.label,
            required: req.value,
            actual: actualValue,
            status: "below",
          });
        }
      } else if (req.operator === "max") {
        if (actualNum <= requiredNum) {
          totalScore += weight;
          matches.push({
            key: req.key,
            label: req.label,
            required: req.value,
            actual: actualValue,
            status: actualNum < requiredNum ? "exceeds" : "meets",
          });
        } else {
          matches.push({
            key: req.key,
            label: req.label,
            required: req.value,
            actual: actualValue,
            status: "below",
          });
        }
      } else {
        if (actualValue.toLowerCase() === req.value.toLowerCase()) {
          totalScore += weight;
          matches.push({
            key: req.key,
            label: req.label,
            required: req.value,
            actual: actualValue,
            status: "meets",
          });
        } else {
          matches.push({
            key: req.key,
            label: req.label,
            required: req.value,
            actual: actualValue,
            status: "below",
          });
        }
      }
    } else {
      // String comparison
      if (actualValue.toLowerCase().includes(req.value.toLowerCase())) {
        totalScore += weight;
        matches.push({
          key: req.key,
          label: req.label,
          required: req.value,
          actual: actualValue,
          status: "meets",
        });
      } else {
        matches.push({
          key: req.key,
          label: req.label,
          required: req.value,
          actual: actualValue,
          status: "below",
        });
      }
    }
  });

  const score = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  return {
    product,
    score,
    matches,
  };
}

export function ProductMatchingEngine({
  companyId,
  contactId,
  opportunityId,
  onAddToProposal,
  onCompare,
  currency = "EUR",
}: ProductMatchingEngineProps) {
  const [requirements, setRequirements] = useState<RequirementField[]>([
    { key: "", label: "", value: "", operator: "min" },
  ]);
  const [selectedForCompare, setSelectedForCompare] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: products = [], isLoading: loadingProducts } = useProducts({
    status: "active",
  });
  const { data: savedRequirements = [] } = useClientRequirements({
    companyId,
    contactId,
    opportunityId,
    status: "active",
  });
  const createRequirement = useCreateRequirement();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  // Calculate matches
  const matchedProducts = useMemo(() => {
    const activeRequirements = requirements.filter((r) => r.key && r.value);
    if (activeRequirements.length === 0) return [];

    let filtered = products;
    if (categoryFilter !== "all") {
      filtered = products.filter((p) => p.category === categoryFilter);
    }

    const matches = filtered.map((product) =>
      calculateMatch(product, activeRequirements)
    );

    return matches.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [products, requirements, categoryFilter]);

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      { key: "", label: "", value: "", operator: "min" },
    ]);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (
    index: number,
    field: keyof RequirementField,
    value: string
  ) => {
    const updated = [...requirements];
    if (field === "key") {
      const preset = COMMON_REQUIREMENTS.find((r) => r.key === value);
      updated[index] = {
        ...updated[index],
        key: value,
        label: preset?.label || value,
        operator: preset?.operator || "min",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRequirements(updated);
  };

  const loadSavedRequirements = (req: ClientRequirement) => {
    const fields: RequirementField[] = Object.entries(req.requirements).map(
      ([key, value]) => {
        const preset = COMMON_REQUIREMENTS.find((r) => r.key === key);
        return {
          key,
          label: preset?.label || key,
          value: String(value),
          operator: preset?.operator || "min",
        };
      }
    );
    setRequirements(fields.length > 0 ? fields : [{ key: "", label: "", value: "", operator: "min" }]);
  };

  const saveCurrentRequirements = () => {
    const reqObj: Record<string, string> = {};
    requirements.forEach((r) => {
      if (r.key && r.value) {
        reqObj[r.key] = r.value;
      }
    });

    if (Object.keys(reqObj).length === 0) return;

    createRequirement.mutate({
      company_id: companyId,
      contact_id: contactId,
      opportunity_id: opportunityId,
      requirements: reqObj,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
    });
  };

  const toggleCompare = (product: Product) => {
    if (selectedForCompare.find((p) => p.id === product.id)) {
      setSelectedForCompare(selectedForCompare.filter((p) => p.id !== product.id));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, product]);
    }
  };

  const getStatusIcon = (status: ProductMatch["matches"][0]["status"]) => {
    switch (status) {
      case "exceeds":
        return <Trophy className="h-3 w-3 text-green-500" />;
      case "meets":
        return <Check className="h-3 w-3 text-green-500" />;
      case "below":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case "missing":
        return <X className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Matching de Produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saved Requirements */}
        {savedRequirements.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Requisitos Guardados
            </Label>
            <div className="flex flex-wrap gap-2">
              {savedRequirements.map((req) => (
                <Button
                  key={req.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedRequirements(req)}
                  className="text-xs"
                >
                  {req.category || "Geral"} ({Object.keys(req.requirements).length})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Requirements Builder */}
        <div className="space-y-3">
          <Label>Requisitos do Cliente</Label>
          {requirements.map((req, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Select
                value={req.key}
                onValueChange={(v) => updateRequirement(index, "key", v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Especificação" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_REQUIREMENTS.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={req.operator}
                onValueChange={(v) =>
                  updateRequirement(index, "operator", v as RequirementField["operator"])
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">≥ Min</SelectItem>
                  <SelectItem value="max">≤ Max</SelectItem>
                  <SelectItem value="exact">= Exato</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={req.value}
                onChange={(e) => updateRequirement(index, "value", e.target.value)}
                placeholder="Valor"
                className="flex-1"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRequirement(index)}
                disabled={requirements.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRequirement}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Requisito
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentRequirements}
              disabled={createRequirement.isPending || requirements.every((r) => !r.value)}
            >
              {createRequirement.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Guardar Requisitos
            </Button>
          </div>
        </div>

        <Separator />

        {/* Compare Actions */}
        {selectedForCompare.length > 1 && onCompare && (
          <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
            <span className="text-sm">
              {selectedForCompare.length} produtos selecionados
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedForCompare([])}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={() => onCompare(selectedForCompare)}
                className="gap-1"
              >
                <GitCompare className="h-4 w-4" />
                Comparar
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : matchedProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Defina requisitos para encontrar produtos compatíveis</p>
              </div>
            ) : (
              matchedProducts.map((match, index) => (
                <Card
                  key={match.product.id}
                  className={`${
                    selectedForCompare.find((p) => p.id === match.product.id)
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Trophy className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-semibold">{match.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {match.product.sku}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`${getScoreColor(match.score)} text-lg font-bold`}
                          variant="outline"
                        >
                          {match.score.toFixed(0)}% Match
                        </Badge>
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(match.product.base_price || 0, currency)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                      {match.matches.map((m) => (
                        <div
                          key={m.key}
                          className="flex items-center gap-1 text-xs"
                        >
                          {getStatusIcon(m.status)}
                          <span className="text-muted-foreground">{m.label}:</span>
                          <span
                            className={
                              m.status === "exceeds" || m.status === "meets"
                                ? "text-green-600"
                                : m.status === "below"
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                            }
                          >
                            {m.actual || "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCompare(match.product)}
                        disabled={
                          selectedForCompare.length >= 4 &&
                          !selectedForCompare.find((p) => p.id === match.product.id)
                        }
                      >
                        <GitCompare className="h-4 w-4 mr-1" />
                        {selectedForCompare.find((p) => p.id === match.product.id)
                          ? "Remover"
                          : "Comparar"}
                      </Button>
                      {onAddToProposal && (
                        <Button
                          size="sm"
                          onClick={() => onAddToProposal(match.product)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
